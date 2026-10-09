{
  description = "Fast, privacy-first desktop & web UI for self-hosted Honcho";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      openconcho = pkgs.rustPlatform.buildRustPackage {
        pname = "openconcho";
        version = "0.8.0";

        src = ./.;

        cargoRoot = "packages/desktop/src-tauri";
        buildAndTestSubdir = "packages/desktop/src-tauri";

        cargoLock.lockFile = ./packages/desktop/src-tauri/Cargo.lock;

        pnpmDeps = pkgs.fetchPnpmDeps {
          pname = "openconcho-pnpm-deps";
          version = "0.8.0";
          src = ./.;
          hash = "sha256-pQRyUMFyQPJ8vTm4zXazOpd0asEyz/MXHF3lKhtvDXE=";
          pnpm = pkgs.pnpm_10;
          fetcherVersion = 3;
        };

        nativeBuildInputs = [
          pkgs.cargo-tauri.hook
          pkgs.nodejs
          pkgs.pnpmConfigHook
          pkgs.pnpm_10
          pkgs.pkg-config
          pkgs.wrapGAppsHook4
        ];

        buildInputs = [
          pkgs.openssl
          pkgs.webkitgtk_4_1
          pkgs.glib-networking
          pkgs.libayatana-appindicator
        ];

        preBuild = ''
          pnpm --filter @openconcho/web build
        '';

        meta = with pkgs.lib; {
          description = "Fast, privacy-first desktop & web UI for self-hosted Honcho";
          homepage = "https://github.com/offendingcommit/openconcho";
          license = licenses.mit;
          mainProgram = "openconcho";
          platforms = platforms.linux;
        };
      };
    in {
      packages = {
        inherit openconcho;
        default = openconcho;
      };

      apps = {
        openconcho = flake-utils.lib.mkApp {drv = openconcho;};
        default = flake-utils.lib.mkApp {drv = openconcho;};
      };
    });
}
