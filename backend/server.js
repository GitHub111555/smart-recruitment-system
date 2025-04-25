 
// backend/server.js

const express      = require('express');
const grpc         = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');
const cors         = require('cors');
const bodyParser   = require('body-parser');
const jwt          = require('jsonwebtoken');
const multer       = require('multer');
const path         = require('path');

const app    = express();
const PORT   = 50051;
const upload = multer({ storage: multer.memoryStorage() });

// 🚨 Load gRPC package definition
const PROTO_PATH = path.join(__dirname, '../protos/recruitment.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef).recruitment;

// gRPC clients
const jobClient       = new proto.JobApplicationService('localhost:50052', grpc.credentials.createInsecure());
const aiClient        = new proto.AIApplicantFilteringService('localhost:50053', grpc.credentials.createInsecure());
const interviewClient = new proto.InterviewService('localhost:50054', grpc.credentials.createInsecure());

// 🔐 JWT middleware
function authenticateToken(req, res, next) {
  console.log(`🔔 [REST] ${req.method} ${req.originalUrl}`, req.body || '');
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Token not provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Express setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/', (_req, res) => res.send('🟢 Smart Recruitment REST API running'));

// 1) Submit application
app.post('/apply', authenticateToken, upload.single('resume'), (req, res) => {
  const { applicant_name, skills, experience, email, phone, support_needs, jobId } = req.body;
  const resume_filename = req.file?.originalname || '';
  jobClient.SubmitApplication({
    applicant_name,
    skills,
    experience: experience.toString(),
    email, phone, support_needs, resume_filename,
    subscribe: req.body.subscribe === 'on',
    notify:    req.body.notify === 'on',
    jobId
  }, (err, jobRes) => {
    if (err) {
      console.error('❌ gRPC SubmitApplication error:', err);
      return res.status(500).json({ message: 'gRPC error during submission' });
    }
    aiClient.FilterApplicant({
      name:   applicant_name,
      resume: resume_filename,
      skills
    }, (aiErr, aiRes) => {
      if (aiErr) {
        console.warn('⚠️ AI filter skipped:', aiErr.message);
        return res.json({ ...jobRes, ai_status: 'Not Available', recommendation: 'Error' });
      }
      res.json({ ...jobRes, ai_status: aiRes.status, recommendation: aiRes.recommendation });
    });
  });
});

// 2) Check status (+ interview time)
app.post('/api/check-status', authenticateToken, (req, res) => {
  const { applicant_name } = req.body;
  jobClient.GetApplicationStatus({ applicant_name }, (err, statusRes) => {
    if (err) {
      if (err.code === grpc.status.NOT_FOUND) {
        return res.status(404).json({ message: 'Application not found' });
      }
      console.error('❌ gRPC GetApplicationStatus error:', err);
      return res.status(500).json({ message: 'Failed to fetch status.' });
    }
    // بعد الحصول على الحالة، نريد أيضاً وقت المقابلة المجدولة
    jobClient.GetAllApplications({}, (err2, allRes) => {
      if (err2) {
        console.error('❌ gRPC GetAllApplications error:', err2);
        return res.json({ ...statusRes });
      }
      const app = allRes.applications.find(a => a.applicant_name === applicant_name);
      const scheduledInterviewTime = app?.scheduledInterviewTime || '';
      res.json({ ...statusRes, scheduledInterviewTime });
    });
  });
});

// 3) Withdraw application
app.post('/api/withdraw', authenticateToken, (req, res) => {
  const { applicant_name } = req.body;
  jobClient.WithdrawApplication({ applicant_name }, (err, cancelRes) => {
    if (err) {
      console.error('❌ gRPC WithdrawApplication error:', err);
      return res.status(500).json({ message: 'Failed to withdraw.' });
    }
    res.json(cancelRes);
  });
});

// 4) Live updates (server streaming)
app.post('/api/stream-updates', authenticateToken, (req, res) => {
  const { applicant_name } = req.body;
  const call = jobClient.GetApplicationUpdates({ applicant_name });
  res.setHeader('Content-Type','application/json');
  call.on('data', data => res.write(JSON.stringify(data) + '\n'));
  call.on('end', () => res.end());
  call.on('error', err => {
    console.error('❌ Stream error:', err);
    res.status(500).end();
  });
});

// --- Admin endpoints ---

// 5) List all
app.get('/api/admin/applications', authenticateToken, (_req, res) => {
  jobClient.GetAllApplications({}, (err, allRes) => {
    if (err) {
      console.error('❌ gRPC GetAllApplications error:', err);
      return res.status(500).json({ message: err.message });
    }
    res.json(allRes.applications);
  });
});

// 6) AI filter one
app.get('/api/admin/ai-filter/:applicant_name', authenticateToken, (req, res) => {
  aiClient.FilterApplicant({
    name: req.params.applicant_name,
    resume: '', skills: ''
  }, (err, aiRes) => {
    if (err) {
      console.error('❌ gRPC FilterApplicant error:', err);
      return res.status(500).json({ message: err.message });
    }
    res.json(aiRes);
  });
});

// 7) (عادة لايستخدم) جدولة لقاء عند الطلب
app.post('/api/schedule-interview', authenticateToken, (req, res) => {
  const { applicant_name, position, datetime } = req.body;
  interviewClient.ScheduleInterview({ applicant_name, position, datetime }, (err, ivRes) => {
    if (err) {
      console.error('❌ gRPC ScheduleInterview error:', err);
      return res.status(500).json({ message: err.message });
    }
    res.json(ivRes);
  });
});

// 8) Accept/Reject مع إرجاع scheduledInterviewTime
app.post('/api/admin/decision/:applicant_name', authenticateToken, (req, res) => {
  const { applicant_name } = req.params;
  const { status }         = req.body;
  jobClient.UpdateApplicationStatus({ applicant_name, status }, (err, upRes) => {
    if (err) {
      console.error('❌ gRPC UpdateApplicationStatus error:', err);
      return res.status(500).json({ message: err.message });
    }
    res.json(upRes);
  });
});

// 9) Chat
const chatStore = {};
app.get('/api/chat/:applicant_name', authenticateToken, (req, res) =>
  res.json(chatStore[req.params.applicant_name] || [])
);
app.post('/api/chat/:applicant_name', authenticateToken, (req, res) => {
  const { sender, text } = req.body;
  chatStore[req.params.applicant_name] ||= [];
  chatStore[req.params.applicant_name].push({ sender, text });
  res.status(204).end();
});

// Start REST API
app.listen(PORT, () => {
  console.log(`🚀 REST API listening on http://localhost:${PORT}`);
});
