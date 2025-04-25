 
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');

const PROTO_PATH  = path.join(__dirname, '../protos/recruitment.proto');
const packageDef  = protoLoader.loadSync(PROTO_PATH);
const { recruitment } = grpc.loadPackageDefinition(packageDef);

// Simple keyword-based AI filter
function simpleAIFilter({ resume, skills }) {
  const keywords = ['node','grpc','javascript','ai'];
  const score = keywords.filter(k => (resume + skills).toLowerCase().includes(k)).length;
  if (score >= 3) return { status: 'Recommended', recommendation: 'Highly Recommended' };
  if (score === 2) return { status: 'Considered',   recommendation: 'Recommended' };
  return { status: 'Not Recommended', recommendation: 'Low Match' };
}

const aiFilterService = {
  // Unary: filter one applicant
  FilterApplicant: (call, callback) => {
    const { name, resume, skills } = call.request;
    const result = simpleAIFilter({ resume, skills });
    console.log(`🤖 [gRPC] FilterApplicant for ${name}`);
    callback(null, result);
  },

  // Client streaming: bulk filter
  BulkFilterApplicants: (call, callback) => {
    const results = [];
    call.on('data', applicant => {
      results.push(simpleAIFilter(applicant));
    });
    call.on('end', () => callback(null, { responses: results }));
  }
};

const server = new grpc.Server();
server.addService(recruitment.AIApplicantFilteringService.service, aiFilterService);

server.bindAsync(
  '0.0.0.0:50053',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('🚀 AIApplicantFilteringService running on port 50053');
    // لا حاجة لاستدعاء server.start() بعد BindAsync
  }
);
