 
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');

const PROTO_PATH  = path.join(__dirname, '../protos/recruitment.proto');
const packageDef  = protoLoader.loadSync(PROTO_PATH);
const { recruitment } = grpc.loadPackageDefinition(packageDef);

const interviewService = {
  // Unary: schedule an interview on demand
  ScheduleInterview: (call, callback) => {
    const { applicant_name, position, datetime } = call.request;
    console.log(`📅 [gRPC] Interview scheduled for ${applicant_name} at ${datetime}`);
    callback(null, { confirmation: `Interview for ${applicant_name} on ${datetime}` });
  },

  // Bidirectional streaming: simulate interview updates
  StreamInterviewUpdates: call => {
    call.on('data', ({ applicant_name }) => {
      const updates = [
        `Preparing schedule for ${applicant_name}`,
        `Interview slot confirmed`,
        `Interview scheduled successfully`
      ];
      updates.forEach((msg, i) => {
        setTimeout(() => {
          call.write({ update_message: msg });
          if (i === updates.length - 1) call.end();
        }, i * 1000);
      });
    });
  }
};

const server = new grpc.Server();
server.addService(recruitment.InterviewService.service, interviewService);

server.bindAsync(
  '0.0.0.0:50054',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('🚀 InterviewService running on port 50054');
    // لا حاجة لاستدعاء server.start() بعد BindAsync
  }
);
