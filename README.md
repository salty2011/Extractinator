# Extractinator

A lightweight, desktop-friendly web application to extract local archive files (zip, 7z, rar, tar, gz, bz2, etc.) into a dedicated output folder. All processing is local. Designed for power users and support staff.

---

## Features
- **Supported formats:** zip, 7z, rar, tar, tar.gz, tgz, tar.bz2, gz, bz2
- **Configurable input/output folders** (persisted to `~/.extractinator/config.json`)
- **Extract each archive into its own folder** (optional)
- **Progress dashboard:** real-time per-file and global progress
- **Manual extraction trigger** for any archive in the input folder
- **Local authentication:** username/password (bcrypt hash)
- **Logs:** verbose logs per job in `~/.extractinator/logs/`

---

## Prerequisites
- **Node.js** v18+
- **npm** v9+
- **7-Zip** command-line binary (`7z`) must be installed and on your PATH for 7z/rar extraction

---

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Start both backend and frontend:**
   ```sh
   npm run dev
   ```
   - Backend runs on [http://localhost:5573](http://localhost:5573)
   - Frontend runs on [http://localhost:5574](http://localhost:5574) (proxied to backend for API)

3. **First login:**
   - Username: `admin`
   - Password: `extractinator`
   - Change the password in `~/.extractinator/config.json` after first login for security.

4. **Configure input/output folders** in the Settings panel.

5. **Drop archive files** into the input folder to auto-extract, or use the Manual Extract option in the dashboard.

---

## Notes
- All extraction and authentication is local; no data is sent externally.
- Logs are written to `~/.extractinator/logs/{yyyy-mm-dd}.log`.
- 7z/rar extraction requires the `7z` binary (install [7-Zip](https://www.7-zip.org/)).
- For best results, run on Linux/macOS or Windows with Node.js and 7-Zip installed.

---

## Troubleshooting
- **7z/rar extraction fails:** Ensure `7z` is installed and in your PATH.
- **Permission errors:** Make sure input/output/log directories are accessible by your user.
- **Frontend not connecting to backend:** Both must be running; check ports and firewall.

---

## License
MIT
