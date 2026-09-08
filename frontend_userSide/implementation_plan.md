# Implementation Plan: Resolve Port Conflict & Shifting Issues

This plan outlines the changes to ensure that the backend and both Angular frontend projects run on fixed ports, and automatically terminate any zombie background processes holding onto these ports.

## User Review Required

> [IMPORTANT]
> The scripts use the system command `taskkill` on Windows and `kill` on macOS/Linux. They are fully safe to run locally under your user account, as they only target local development ports (5000, 4200, 4201) to prevent port collisions.

---

## Proposed Changes

We will introduce a central port cleanup script and update the startup configuration in each of the three project subdirectories.

### [Root Workspace]

#### [NEW] [kill-port.js](file:///c:/Users/abhin/Desktop/Maithon_service_project/scripts/kill-port.js)
Create a cross-platform helper script that terminates any running processes on the specified port(s). It supports both Windows (`netstat` + `taskkill`) and macOS/Linux (`lsof` + `kill`).

#### [NEW] [package.json](file:///c:/Users/abhin/Desktop/Maithon_service_project/package.json)
Create a root-level `package.json` to make orchestrating all services together easier.

---

### [Frontend - User Side]

#### [MODIFY] [package.json](file:///c:/Users/abhin/Desktop/Maithon_service_project/frontend_userSide/package.json)
- Set the `"start"` script to explicitly request port `4200`: `ng serve --port 4200`
- Add a `"prestart"` script to run the cleanup script on port `4200` before Angular starts: `node ../scripts/kill-port.js 4200`

---

### [Frontend - Admin Panel]

#### [MODIFY] [package.json](file:///c:/Users/abhin/Desktop/Maithon_service_project/frontend_admin_panel/package.json)
- Set the `"start"` script to explicitly request port `4201`: `ng serve --port 4201`
- Add a `"prestart"` script to run the cleanup script on port `4201` before Angular starts: `node ../scripts/kill-port.js 4201`

---

### [Backend]

#### [MODIFY] [package.json](file:///c:/Users/abhin/Desktop/Maithon_service_project/backend/package.json)
- Add a `"predev"` script to run the cleanup script on port `5000` before nodemon starts: `node ../scripts/kill-port.js 5000`
- Add a `"prestart"` script to run the cleanup script on port `5000` before the node production server starts: `node ../scripts/kill-port.js 5000`

---

## Verification Plan

### Manual Verification
1. Run `npm start` in `frontend_userSide`. It should kill anything on `4200` and start on port `4200`.
2. Open a separate terminal, and run `npm start` in `frontend_admin_panel`. It should kill anything on `4201` and start on port `4201`.
3. Stop the servers using `Ctrl + C`, run them again, and verify they successfully bind to their respective ports without any "Port already in use" prompts or shifting to `4202`, etc.
4. Verify that logging in and navigating the UI works seamlessly because the domain origin and localStorage states remain aligned on the fixed ports.
