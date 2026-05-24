//! Localhost Honcho instance discovery.
//!
//! Probes a range of ports on 127.0.0.1 for a Honcho `/health` endpoint
//! that returns `{"status":"ok"}`. Desktop-only feature: the browser
//! can't port-scan due to CORS, so this lives in the Tauri Rust shell.

use serde::Serialize;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

const DEFAULT_START_PORT: u16 = 8000;
const DEFAULT_END_PORT: u16 = 8100;
const CONNECT_TIMEOUT_MS: u64 = 150;
const REQUEST_TIMEOUT_MS: u64 = 250;

#[derive(Serialize, Debug)]
pub struct DiscoveredInstance {
	pub port: u16,
	pub base_url: String,
}

async fn probe_port(port: u16) -> Option<DiscoveredInstance> {
	let addr = format!("127.0.0.1:{}", port);

	let connect = TcpStream::connect(&addr);
	let stream = tokio::time::timeout(Duration::from_millis(CONNECT_TIMEOUT_MS), connect)
		.await
		.ok()?
		.ok()?;

	let mut stream = stream;
	let req = b"GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";

	let io = async {
		stream.write_all(req).await.ok()?;
		let mut buf = Vec::with_capacity(512);
		stream.read_to_end(&mut buf).await.ok()?;
		Some(buf)
	};
	let buf = tokio::time::timeout(Duration::from_millis(REQUEST_TIMEOUT_MS), io)
		.await
		.ok()??;

	let body = String::from_utf8_lossy(&buf);
	if body.contains("\"status\":\"ok\"") {
		Some(DiscoveredInstance {
			port,
			base_url: format!("http://127.0.0.1:{}", port),
		})
	} else {
		None
	}
}

#[tauri::command]
pub async fn discover_honcho_instances(
	start_port: Option<u16>,
	end_port: Option<u16>,
) -> Vec<DiscoveredInstance> {
	let start = start_port.unwrap_or(DEFAULT_START_PORT);
	let end = end_port.unwrap_or(DEFAULT_END_PORT);
	if end < start {
		return Vec::new();
	}

	let probes: Vec<_> = (start..=end).map(probe_port).collect();
	let results = futures::future::join_all(probes).await;
	let mut found: Vec<DiscoveredInstance> = results.into_iter().flatten().collect();
	found.sort_by_key(|d| d.port);
	found
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn rejects_inverted_port_range() {
		let found = discover_honcho_instances(Some(9000), Some(8000)).await;
		assert!(found.is_empty());
	}

	#[tokio::test]
	async fn ignores_ports_with_no_listener() {
		// Port 1 should reliably have no listener — connect fails fast.
		let result = probe_port(1).await;
		assert!(result.is_none());
	}

	#[tokio::test]
	#[ignore = "requires live Honcho stacks on 8001-8005"]
	async fn finds_live_hermes_stacks() {
		let found = discover_honcho_instances(Some(8000), Some(8010)).await;
		let ports: Vec<u16> = found.iter().map(|d| d.port).collect();
		assert_eq!(ports, vec![8001, 8002, 8003, 8004, 8005]);
	}
}
