# 📌 Sticky-Notes

A lightweight, clean, and **always-on-top** sticky notes desktop application designed to boost your daily productivity. Keep your thoughts, daily tasks, and quick references directly on your desktop without cluttering your browser tabs.

---

## ✨ Features

*   **Always on Top:** Never lose your notes under a mountain of windows—toggle them to stay pinned visually above everything else.
*   **Lightweight & Fast:** Minimal memory footprint, allowing it to sit seamlessly in your workspace background.
*   **Clean Design:** A beautiful, distraction-free user interface designed specifically for Windows.
*   **Persistent Storage:** Automatically retains your content so your notes are right where you left them when you relaunch the app.

---

## 🛠️ Technology Used

This application is built entirely using modern web standards wrapped inside a native desktop container:

*   **Core Desktop Framework:** [Electron](https://www.electronjs.org/) (Enables building cross-platform desktop apps using JavaScript, HTML, and CSS)
*   **Frontend User Interface:** 
    *   **HTML5** — Structured markup for the application views and configuration states.
    *   **CSS3** — Clean, responsive layouts styled specifically for a desktop widget aesthetic.
    *   **JavaScript (ES6+)** — Interprocess Communication (IPC) handling, state management, and user interaction mechanics.
*   **Production Bundling & Packaging:** [Electron Builder](https://www.electron.build/) (Configured with NSIS for full installers and optimized portable `.exe` formats)

---

## 🚀 How to Download & Use (For Regular Users)

If you just want to use the application to be more productive and don't care about looking at the code, follow these simple steps:

1.  Navigate to the **[Releases](https://github.com/daxshonly/sticky-notes/releases)** tab on the right side of this GitHub page.
2.  Download the latest version:
    *   **Standard Installer:** Download `Sticky Notes Setup 1.0.0.exe` to install it natively on your computer with desktop shortcuts.
    *   **Portable Version:** Download `Sticky Notes 1.0.0.exe` to run the application immediately without going through an installer process.
3.  Double-click the downloaded file and enjoy your new workspace helper!

---

## 💻 Local Development Setup (For Developers)

If you want to clone this repository, explore the code, or run the application locally in development mode, follow these steps:

### Prerequisites

Make sure you have **Node.js** (which includes `npm`) installed on your machine. You can download the latest version from [nodejs.org](https://nodejs.org/).

### Installation Steps
1.  Fork the Project (Click the 'Fork' button at the top right of this page).

2.  Clone the Repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/sticky-notes.git
    ```
3.  Navigate into the Project Directory:
    ```bash
    cd sticky-notes
    ```
4.  Install Required Dependencies:
    ```bash
    npm install
    ```
5.  Launch the Application Locally:
    ```bash
    npm start
    ```

## 📦 Production Compilation

To package production binaries natively on your own local Windows machine, trigger the distribution pipeline using:
    ```bash
    npm run dist
    ```
