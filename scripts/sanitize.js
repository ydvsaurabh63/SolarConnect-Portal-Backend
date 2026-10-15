require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solarconnect';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('--- Migrating Users to Real Business Entities ---');
  // 1. Update Core Role accounts
  await db.collection('users').updateMany(
    { role: 'superadmin' },
    { $set: { fullName: 'GetSolarConnect', companyName: 'GetSolarConnect' } }
  );

  await db.collection('users').updateMany(
    { role: 'admin' },
    { $set: { fullName: 'Vijay Kumar Singh', companyName: 'Vijay Kumar Singh Solar Operations', createdByName: 'GetSolarConnect' } }
  );

  await db.collection('users').updateMany(
    { role: 'distributor' },
    { 
      $set: { 
        fullName: 'Nandani Enterprise', 
        companyName: 'Nandani Enterprise',
        adminName: 'Vijay Kumar Singh',
        createdByName: 'Vijay Kumar Singh',
        assignedPartnerName: 'Solarize',
        assignedFinancerName: 'SBI'
      } 
    }
  );

  await db.collection('users').updateMany(
    { role: { $in: ['agent', 'executive'] } },
    { 
      $set: { 
        fullName: 'Rakesh', 
        distributorName: 'Nandani Enterprise',
        createdByName: 'Nandani Enterprise',
        adminName: 'Vijay Kumar Singh'
      } 
    }
  );

  await db.collection('users').updateMany(
    { role: 'partner' },
    { 
      $set: { 
        fullName: 'Solarize', 
        companyName: 'Solarize',
        adminName: 'Vijay Kumar Singh'
      } 
    }
  );

  await db.collection('users').updateMany(
    { role: 'financer' },
    { 
      $set: { 
        fullName: 'SBI', 
        companyName: 'State Bank of India (SBI)',
        adminName: 'Vijay Kumar Singh'
      } 
    }
  );

  await db.collection('users').updateMany(
    { role: 'installer' },
    { 
      $set: { 
        fullName: 'Neha Solar', 
        companyName: 'Neha Solar',
        createdByName: 'Solarize',
        adminName: 'Vijay Kumar Singh'
      } 
    }
  );

  // Clean remaining user lineage references
  await db.collection('users').updateMany(
    { agentName: { $regex: /Ramesh Sharma/i } },
    { $set: { agentName: 'Rakesh' } }
  );
  await db.collection('users').updateMany(
    { distributorName: { $regex: /Surya Solar/i } },
    { $set: { distributorName: 'Nandani Enterprise' } }
  );
  await db.collection('users').updateMany(
    { adminName: { $regex: /State Operations Admin/i } },
    { $set: { adminName: 'Vijay Kumar Singh' } }
  );

  console.log('--- Migrating Applications to Real Business Entities ---');
  await db.collection('applications').updateMany(
    { agentName: { $regex: /Ramesh Sharma/i } },
    { $set: { agentName: 'Rakesh' } }
  );
  await db.collection('applications').updateMany(
    { executiveName: { $regex: /Ramesh Sharma/i } },
    { $set: { executiveName: 'Rakesh' } }
  );
  await db.collection('applications').updateMany(
    { executiveSignature: { $regex: /Ramesh Sharma/i } },
    { $set: { executiveSignature: 'Rakesh' } }
  );
  await db.collection('applications').updateMany(
    { 'paymentDetails.collectedByAgentName': { $regex: /Ramesh Sharma/i } },
    { $set: { 'paymentDetails.collectedByAgentName': 'Rakesh' } }
  );

  await db.collection('applications').updateMany(
    { distributorName: { $regex: /Surya Solar/i } },
    { $set: { distributorName: 'Nandani Enterprise' } }
  );
  await db.collection('applications').updateMany(
    { adminName: { $regex: /State Operations Admin/i } },
    { $set: { adminName: 'Vijay Kumar Singh' } }
  );

  await db.collection('applications').updateMany(
    { 'partnerDetails.partnerName': { $regex: /Apex Solar/i } },
    { $set: { 'partnerDetails.partnerName': 'Solarize' } }
  );
  await db.collection('applications').updateMany(
    { 'financingDetails.financerName': { $regex: /Surya Green/i } },
    { $set: { 'financingDetails.financerName': 'SBI' } }
  );
  await db.collection('applications').updateMany(
    { 'installerDetails.installerName': { $regex: /Vikas Verma/i } },
    { $set: { 'installerDetails.installerName': 'Neha Solar' } }
  );
  await db.collection('applications').updateMany(
    { 'adminVerification.verifiedBy': { $regex: /State Operations Admin/i } },
    { $set: { 'adminVerification.verifiedBy': 'Vijay Kumar Singh' } }
  );
  await db.collection('applications').updateMany(
    { 'verification.verifiedBy': { $regex: /State Operations Admin/i } },
    { $set: { 'verification.verifiedBy': 'Vijay Kumar Singh' } }
  );

  // Also sanitize passwords & emails for consumer login compliance:
  // Login ID: user email, Password: FirstName@last4digitsOfMobile
  const apps = await db.collection('applications').find({}).toArray();
  for (let a of apps) {
    let cleanFull = (a.fullName || '').replace(/\s*\(.*?\)/g, '').trim();
    let cleanAgent = (a.agentName || '').replace(/\s*\(.*?\)/g, '').trim();
    let cleanExec = (a.executiveName || '').replace(/\s*\(.*?\)/g, '').trim();

    const rawFirst = (cleanFull || 'User').split(/\s+/)[0];
    const firstName = rawFirst ? (rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase()) : 'User';
    const cleanMob = String(a.mobile || '').replace(/\D/g, '');
    const last4Mob = cleanMob.slice(-4) || '1234';
    const newPass = `${firstName}@${last4Mob}`;
    const newEmail = (a.email || '').toLowerCase().trim() || (cleanMob ? `${cleanMob}@solar.com` : a.consumerNo);

    await db.collection('applications').updateOne(
      { _id: a._id },
      { 
        $set: { 
          fullName: cleanFull, 
          agentName: cleanAgent, 
          executiveName: cleanExec,
          'consumerAccount.tempPassword': newPass,
          'consumerAccount.loginId': newEmail,
          'consumerAccount.email': newEmail
        } 
      }
    );

    await db.collection('users').updateOne(
      { $or: [{ email: newEmail }, { mobile: a.mobile }, { registrationId: a.registrationId }] },
      {
        $set: {
          password: newPass,
          email: newEmail,
          fullName: cleanFull,
          mobile: a.mobile,
        }
      }
    );
    console.log(`Updated App ${a.registrationId} (${cleanFull}) -> Login: ${newEmail}, Pass: ${newPass}`);
  }

  console.log('✅ Real Business Entity Data & Consumer Logins Synced to MongoDB!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
