# Third-party sources

- GSAP 3.15.0, GreenSock/Webflow: https://github.com/greensock/GSAP ; https://gsap.com/community/standard-license/ . Used for local UI presentation/celebration, not a visual animation-builder product. Retain upstream notices. Not represented as an MIT/OSI dependency.
- Wrangler 4.157.0, Cloudflare: https://github.com/cloudflare/workers-sdk . Development/backup tooling; upgraded from initial 4.141.0 after npm audit reported vulnerable transitive dependencies. Zero findings after update.
- Node.js built-in HTTP/crypto/SQLite and browser platform APIs. Exact Node version verified during build: 24.20.0.
- Original VISTAMATIONS symbol SVGs and motion preset code authored for this app; no external artwork or private image metadata.
- Approved Tower base-template ancestry: C:/kubernate/docker01-sandbox-dojo-base-model/agent-virtual-sim-world. Private reference copy remains ignored by Git. Its L0–L5 structure informed the app shell; source was not edited.

Exact packages are pinned with package-lock.json. No implication that an entire public repository has a single license covering all bundled dependencies.
