 
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');

// Load protobuf
const PROTO_PATH   = path.join(__dirname, '../protos/recruitment.proto');
const packageDef   = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const { recruitment } = grpc.loadPackageDefinition(packageDef);

// In-memory store
let applications = [];

// Auto-schedule helper (2 days later at 10:00)
function getAutoInterviewTime() {
  const dt = new Date();
  dt.setDate(dt.getDate() + 2);
  dt.setHours(10, 0, 0, 0);
  return dt.toISOString();
}

const jobApplicationService = {
  // Submit application
  SubmitApplication: (call, callback) => {
    const req = call.request;
    console.log(`🔔 [gRPC] SubmitApplication received for ${req.applicant_name}`);

    const newApp = {
      applicant_name:  req.applicant_name,
      skills:          req.skills,
      experience:      req.experience,
      email:           req.email,
      phone:           req.phone,
      support_needs:   req.support_needs,
      resume_filename: req.resume_filename,
      subscribe:       req.subscribe,
      notify:          req.notify,
      jobId:           req.jobId,
      status:          'Received',
      scheduledInterviewTime: ''
    };
    applications.push(newApp);

    callback(null, {
      applicant_name: newApp.applicant_name,
      status:         'Success',
      message:        `Application received from ${newApp.applicant_name} for Job #${newApp.jobId}`
    });
  },

  // Get status
  GetApplicationStatus: (call, callback) => {
    const name = call.request.applicant_name;
    const app  = applications.find(a => a.applicant_name === name);
    if (!app) {
      console.log(`⚠️ [gRPC] Status request: ${name} not found`);
      return callback({ code: grpc.status.NOT_FOUND, message: 'Application not found' });
    }
    console.log(`ℹ️ [gRPC] Returning status="${app.status}" for ${name}`);
    callback(null, { applicant_name: app.applicant_name, status: app.status });
  },

  // Withdraw
  WithdrawApplication: (call, callback) => {
    const name = call.request.applicant_name;
    const idx  = applications.findIndex(a => a.applicant_name === name);
    if (idx === -1) {
      console.log(`⚠️ [gRPC] Withdraw: ${name} not found`);
      return callback({ code: grpc.status.NOT_FOUND, message: 'Application not found' });
    }
    applications.splice(idx, 1);
    console.log(`🗑️ [gRPC] Application for ${name} withdrawn`);
    callback(null, { status: 'Withdrawn', message: 'Application withdrawn successfully' });
  },

  // Stream updates
  GetApplicationUpdates: call => {
    const name = call.request.applicant_name;
    const app  = applications.find(a => a.applicant_name === name);
    if (!app) {
      console.log(`⚠️ [gRPC] StreamUpdates: ${name} not found`);
      return call.emit('error', { code: grpc.status.NOT_FOUND, message: 'Application not found' });
    }
    console.log(`🔄 [gRPC] Streaming updates for ${name}`);
    const updates = ['Received','Under Review','Interview Scheduled','Offer Extended','Hired'];
    let i = 0;
    const iv = setInterval(() => {
      if (call.cancelled || i >= updates.length) {
        clearInterval(iv);
        return call.end();
      }
      console.log(`✉️ [gRPC] Update to ${name}: "${updates[i]}"`);
      call.write({ applicant_name: name, status: updates[i++] });
    }, 2000);
  },

  // Get all
  GetAllApplications: (_call, callback) => {
    console.log('ℹ️ [gRPC] GetAllApplications');
    const list = applications.map(a => ({
      applicant_name:         a.applicant_name,
      skills:                 a.skills,
      experience:             a.experience,
      email:                  a.email,
      phone:                  a.phone,
      support_needs:          a.support_needs,
      resume_filename:        a.resume_filename,
      subscribe:              a.subscribe,
      notify:                 a.notify,
      jobId:                  a.jobId,
      status:                 a.status,
      scheduledInterviewTime: a.scheduledInterviewTime
    }));
    callback(null, { applications: list });
  },

  // Update status & auto-schedule interview
  UpdateApplicationStatus: (call, callback) => {
    const { applicant_name, status } = call.request;
    console.log(`🔔 [gRPC] UpdateStatus: ${applicant_name} → ${status}`);
    const app = applications.find(a => a.applicant_name === applicant_name);
    if (!app) {
      console.log(`⚠️ [gRPC] UpdateStatus: ${applicant_name} not found`);
      return callback({ code: grpc.status.NOT_FOUND, message: 'Application not found' });
    }
    app.status = status;
    if (status === 'Accepted' && !app.scheduledInterviewTime) {
      app.scheduledInterviewTime = getAutoInterviewTime();
      console.log(`🗓️ [gRPC] Auto-scheduled interview for ${applicant_name} at ${app.scheduledInterviewTime}`);
    }
    callback(null, {
      message:                `Status updated to ${status}`,
      scheduledInterviewTime: app.scheduledInterviewTime
    });
  }
};

// Bootstrap gRPC server
function main() {
  const server = new grpc.Server();
  server.addService(recruitment.JobApplicationService.service, jobApplicationService);
  server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
    console.log('🚀 JobApplicationService running on :50052');
    server.start();
  });
}

main();
