# Security

If you find a vulnerability in SoundGround, please report it privately through
GitHub's "Report a vulnerability" button on the Security tab of this repository
rather than opening a public issue.

You should get an acknowledgement within a few days. Fixes ship as normal
commits once confirmed.

Scope notes:

- The app runs read-only against the SoundCloud API with credentials supplied
  by the operator. There are no user accounts.
- Local SQLite databases under `data/` are never committed and are excluded
  from the Docker build context.
