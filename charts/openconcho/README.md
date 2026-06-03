# openconcho Helm Chart

Helm 3 chart for self-hosting the [openconcho](https://github.com/offendingcommit/openconcho) web UI on Kubernetes.

The chart deploys a single nginx-unprivileged container (port 8080, UID 101) that serves the React SPA and reverse-proxies Honcho API calls under `/api` to avoid browser CORS issues.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- A running [Honcho](https://github.com/plastic-labs/honcho) instance reachable from within the cluster (or via a configured ingress)

## Installing

Add the chart repository:

```bash
helm registry login ghcr.io --username <github-username> --password <github-token>
```

Install the chart:

```bash
helm install openconcho oci://ghcr.io/offendingcommit/charts/openconcho \
  --version 0.14.0 \
  --set honcho.defaultUrl=https://honcho.example.com
```

Or with a values file (recommended):

```bash
helm install openconcho oci://ghcr.io/offendingcommit/charts/openconcho \
  --version 0.14.0 \
  -f my-values.yaml
```

## Upgrading

```bash
helm upgrade openconcho oci://ghcr.io/offendingcommit/charts/openconcho \
  --version <new-version> \
  -f my-values.yaml
```

## Uninstalling

```bash
helm uninstall openconcho
```

## Configuration

All values with their defaults are documented in [`values.yaml`](values.yaml). Key options:

| Value | Default | Description |
|---|---|---|
| `replicaCount` | `1` | Number of pod replicas |
| `image.repository` | `ghcr.io/offendingcommit/openconcho-web` | Container image |
| `image.tag` | `""` | Tag; defaults to chart `appVersion` |
| `image.pullPolicy` | `IfNotPresent` | Image pull policy |
| `honcho.defaultUrl` | `""` | Honcho URL pre-seeded in the UI |
| `honcho.upstreamAllowlist` | `""` | SSRF guard (comma-separated host globs) |
| `service.type` | `ClusterIP` | `ClusterIP` / `NodePort` / `LoadBalancer` |
| `service.port` | `80` | Service port |
| `ingress.enabled` | `false` | Enable Ingress resource |
| `ingress.className` | `""` | IngressClass name |
| `autoscaling.enabled` | `false` | Enable HorizontalPodAutoscaler |
| `podDisruptionBudget.enabled` | `false` | Enable PodDisruptionBudget |
| `networkPolicy.enabled` | `false` | Enable NetworkPolicy (same-namespace only) |
| `resources.requests.memory` | `32Mi` | Memory request |
| `resources.limits.memory` | `128Mi` | Memory limit |

## Examples

### Minimal (ClusterIP, no ingress)

```yaml
honcho:
  defaultUrl: http://honcho.honcho.svc.cluster.local:8000
```

### With Ingress and TLS (cert-manager)

```yaml
honcho:
  defaultUrl: https://honcho.example.com

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: openconcho.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: openconcho-tls
      hosts:
        - openconcho.example.com
```

### With autoscaling and disruption budget

```yaml
replicaCount: 2

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

podDisruptionBudget:
  enabled: true
  minAvailable: 1
```

### With NetworkPolicy

> **Note:** When `networkPolicy.enabled=true` and `ingress.enabled=true`, you must add
> a policy that allows traffic from the ingress-controller namespace. Run
> `helm status <release>` for the exact `kubectl edit` command after install.

```yaml
networkPolicy:
  enabled: true

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: openconcho.example.com
      paths:
        - path: /
          pathType: Prefix
```

### Private registry

```yaml
image:
  repository: registry.example.com/myorg/openconcho-web
  tag: "0.14.0"
  pullPolicy: Always

imagePullSecrets:
  - name: registry-credentials
```

## ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: openconcho
  namespace: argocd
spec:
  project: default
  source:
    repoURL: ghcr.io/offendingcommit/charts
    chart: openconcho
    targetRevision: 0.14.0
    helm:
      valuesObject:
        honcho:
          defaultUrl: https://honcho.example.com
        ingress:
          enabled: true
          className: nginx
          annotations:
            cert-manager.io/cluster-issuer: letsencrypt-prod
          hosts:
            - host: openconcho.example.com
              paths:
                - path: /
                  pathType: Prefix
          tls:
            - secretName: openconcho-tls
              hosts:
                - openconcho.example.com
  destination:
    server: https://kubernetes.default.svc
    namespace: openconcho
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

> OCI chart sources require ArgoCD 2.10+ (OCI Helm support GA).

## Helm tests

After install, run the bundled tests to verify the deployment is healthy:

```bash
helm test openconcho
```

Two test pods run and exit 0 on success:

| Test | What it checks |
|---|---|
| `test-healthz` | `GET /healthz` body equals `ok` |
| `test-spa-root` | `GET /` returns HTTP 200 |

Pass `--logs` to see output from failing pods:

```bash
helm test openconcho --logs
```

## Security posture

| Control | Value |
|---|---|
| Run as UID/GID | 101 (nginx-unprivileged) |
| `runAsNonRoot` | `true` |
| `readOnlyRootFilesystem` | `true` |
| Linux capabilities | all dropped |
| `seccompProfile` | `RuntimeDefault` |
| `allowPrivilegeEscalation` | `false` |
| `automountServiceAccountToken` | `false` |
| Writable paths | `/var/cache/nginx`, `/var/run`, `/tmp` (tmpfs) |
