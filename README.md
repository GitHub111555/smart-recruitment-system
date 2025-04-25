
# Smart Recruitment System 🧠💼

A distributed system built using **Node.js**, **gRPC**, and **Express**, designed to streamline the hiring process using intelligent microservices.

---

## 📌 Features

- 🔐 JWT-based authentication for secure access
- 📄 Submit and track job applications
- 📅 Schedule interviews with live update support
- 🤖 AI-powered filtering of applicants (Unary + Client Streaming)
- 📡 Microservices communicate over gRPC (Unary, Streaming)
- 🌐 REST API Gateway (Express.js) connects frontend with backend
- 🌓 Dark/Light mode toggle across UI
- 🔔 Notifications & subscription system (optional)
- 💬 Admin panel with live chat, resume viewing, filtering, and decision tools

---

## 📁 Project Structure

```
smart-recruitment-system/
│
├──📁 auth/                        # JWT login & auth middleware
│   ├── authController.js
│   ├── authServer.js
│   └── middleware.js
│
├──📁 backend/                     # API Gateway (Express server)
│   └── server.js
│   └── uploads                    #  To save and upload files
│
├──📁 frontend/                    # Static frontend UI
│   ├── admin.html
│   ├── apply.html
│   ├── home.html
│   ├── login.html
│   ├── status.html
│   └── jobs.json
│
├──📁 frontendServer.js/   # Provide a clear entry point for users (e.g. http://localhost:3000/home.html).  
│
├──📁 node_modules    #  Libraries
│    
├──📁 protos/                      # Proto definitions for gRPC
│   └── recruitment.proto
│
├──📁 services/                    # Business logic for gRPC services
│   ├── aiFilterService.js
│   ├── interviewService.js
│   └── jobApplicationService.js
│
├──📁 README.md
├──📁 package.json
├──📁 package-lock.json
├──📁 start-all.bat          # ✅ Visual diagram of architecture
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/smart-recruitment-system.git
cd smart-recruitment-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Services

Open multiple terminals and run each service:

```bash
node auth/authServer.js
node services/jobApplicationService.js
node services/interviewService.js
node services/aiFilterService.js
node backend/server.js
```

### 4. Open Frontend Pages (locally)

You can open the HTML files from the `frontend/` folder directly in your browser:

- `home.html` – Job listings, login, and apply buttons
- `login.html` – Login to get your token (stored in localStorage)
- `apply.html` – Submit job applications
- `status.html` – View and withdraw your application
- `admin.html` – Admin dashboard (filter, chat, decision, scheduling)

---

## 🧩 Architecture Diagram

![Architecture](./frontend/architecture.png)

- **Frontend** interacts with **Backend** (REST API with JWT)
- **Backend** connects to 3 gRPC microservices:
  - `JobApplicationService`: Submit, check, withdraw apps
  - `InterviewService`: Schedule and stream interview updates
  - `AIApplicantFilteringService`: Filter applicants via AI logic

---

## 🛠 Technologies Used

- **Node.js**  
- **gRPC** & **Protocol Buffers**  
- **Express.js**  
- **JWT**  
- **HTML/CSS/JavaScript**  
- **CORS** & **body-parser**  
- **In-Memory Storage** (No database used)

---

## 👤 Author

**Sinan Shuwaili**  
📧 [x24139858@student.ncirl.ie](mailto:x24139858@student.ncirl.ie)  
🌐 [LinkedIn](https://www.linkedin.com/in/sinan-shuwaili85)

**Higher Diploma in Science in Computing(Software Development)
**National College of Ireland**

---

## 📄 License

This project i developed for academic purposes as part of the Distributed Systems Program: Higher Diploma in Science in Computing (Software Development) at the National College of Ireland.

---
