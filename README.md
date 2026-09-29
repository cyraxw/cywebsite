# CODM Attachments Hub

## Requirements
- Node.js 18+ (Node 20 LTS recommended)
- Windows, macOS, or Linux

## Run
1. Open a terminal in this folder.
2. Run:
   npm install
3. Run:
   npm start
4. Open:
   http://localhost:3000


Admin can add/remove guns and featured callouts. Normal visitors cannot modify content.

## Data
The SQLite database is created automatically as `codm.db`.
Uploaded files go into `uploads/`.

## Important
For a public deployment, change the default admin credentials and the `x-admin-key` authentication design to a proper user/session system. This package is designed for local use and a straightforward starting point.
