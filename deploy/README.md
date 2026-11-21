# Frontend deployment

The GitHub workflow uploads each build to a unique sibling staging directory. `scripts/publish_frontend.py` validates entry dependencies, publishes resources without deleting previous hashed assets, then atomically replaces `index.html` last. Failed uploads do not clear the live site. Deployments are serialized with GitHub Actions concurrency.

Install `admin-static-locations.conf` inside the OpenResty virtual host's `server` block, replacing its existing SPA `location /` block. On the current server the include is `/www/sites/admin.jeffsyd.top/static-locations.conf`; the host configuration is `/opt/1panel/apps/openresty/openresty/conf/conf.d/admin.jeffsyd.top.conf`. Back up the virtual host, run `nginx -t` inside the OpenResty container, then reload. This configuration is managed separately from the build upload.

- HTML uses `Cache-Control: no-cache` so refreshes revalidate the entry.
- Hashed `/assets/` files use immutable caching. Missing assets return 404 rather than the SPA HTML.
- Historical hashed assets are retained for open browser tabs. They consume additional disk space across releases; the workflow does not automatically prune them.
- The client attempts one automatic reload per five minutes after a Vite preload failure. Offline clients, denied browser storage, and repeated failures show the localized retry screen instead. Tabs opened before this fix require one manual refresh.

Validation:

```sh
pnpm test
python3 -m unittest discover -s scripts -p 'test_*.py'
pnpm build
```
