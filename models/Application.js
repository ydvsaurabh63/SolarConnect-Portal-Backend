const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    // Section 6.1: Registration Header
    registrationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    executiveName: {
      type: String,
      default: 'Self / Direct Applicant',
      trim: true,
    },
    executiveId: {
      type: String,
      default: 'EX-ONLINE',
      trim: true,
    },
    areaDistrict: {
      type: String,
      required: true,
      trim: true,
    },
    issuedOn: {
      type: Date,
      default: Date.now,
    },
    submissionMode: {
      type: String,
      enum: ['FIELD_EXECUTIVE', 'SELF_APPLICANT'],
      default: 'SELF_APPLICANT',
    },

    // Hierarchy linkages & Explicit Codes
    agentId: { type: String, default: '' },
    agentName: { type: String, default: '' },
    agentCode: { type: String, default: '' },
    distributorId: { type: String, default: '' },
    distributorName: { type: String, default: '' },
    distributorCode: { type: String, default: '' },
    adminId: { type: String, default: '' },
    adminName: { type: String, default: '' },
    adminCode: { type: String, default: '' },
    userCode: { type: String, default: '' },

    // Section 6.2: Applicant Details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    alternateNo: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    districtCity: {
      type: String,
      required: true,
      trim: true,
    },
    pinCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Section 6.3: Property & Electricity
    consumerNo: {
      type: String,
      required: true,
      trim: true,
    },
    avgMonthlyBill: {
      type: Number,
      required: true,
    },
    connectionName: {
      type: String,
      enum: ['Self', 'Father', 'Mother', 'Spouse', 'Landlord', 'Other'],
      default: 'Self',
    },
    propertyType: {
      type: String,
      enum: ['Residential', 'Commercial', 'Agricultural'],
      default: 'Residential',
    },
    ownership: {
      type: String,
      enum: ['Owned', 'Rented'],
      default: 'Owned',
    },
    propertyAddress: {
      type: String,
      required: true,
      trim: true,
    },
    landDetails: {
      type: String,
      default: '',
      trim: true,
    },
    rooftopArea: {
      type: Number,
      default: 0,
    },
    roofType: {
      type: String,
      enum: ['RCC', 'Tin', 'Other'],
      default: 'RCC',
    },

    // Document Numbers & Specific Identifiers
    aadhaarNumber: {
      type: String,
      default: '',
      trim: true,
    },
    panNumber: {
      type: String,
      default: '',
      trim: true,
    },
    bankDetails: {
      accountNumber: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true },
      bankName: { type: String, default: '', trim: true },
    },

    // Section 6.4: Document Checklist & GPS Rooftop Photo with Step-by-Step Audit
    documents: {
      aadhaarCard: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
      panCard: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
      bijliBill: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
      bankPassbook: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
      jaminRasid: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
      rooftopGpsPhoto: {
        collected: { type: Boolean, default: false },
        fileName: String,
        fileUrl: String,
        mapSnapshotUrl: String,
        googleMapsUrl: String,
        sitePhotos: { type: [String], default: [] },
        roofAreaMarked: String,
        status: { type: String, default: 'Pending' },
        remarks: { type: String, default: '' },
        gpsLatitude: String,
        gpsLongitude: String,
        capturedWithGps: { type: Boolean, default: true },
      },
      paymentProof: { collected: { type: Boolean, default: false }, fileName: String, fileUrl: String, status: { type: String, default: 'Pending' }, remarks: { type: String, default: '' } },
    },

    // Section 6.5: Declaration & Signatures
    declarationAccepted: {
      type: Boolean,
      required: true,
      default: true,
    },
    applicantSignature: {
      type: String,
      default: '',
    },
    executiveSignature: {
      type: String,
      default: '',
    },

    // Multi-Tier Verification Workflow Stages
    distributorVerification: {
      status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending',
      },
      verifiedAt: Date,
      verifiedBy: String,
      rejectionReason: {
        type: String,
        default: '',
      },
    },

    adminVerification: {
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
      },
      verifiedAt: Date,
      verifiedBy: String,
      rejectionReason: {
        type: String,
        default: '',
      },
    },

    // Master Lifecycle Status
    overallStatus: {
      type: String,
      enum: [
        'Pending_Distributor',
        'Distributor_Verified',
        'Rejected_By_Distributor',
        'Admin_Approved',
        'Rejected_By_Admin',
        'Assigned_To_Partner',
        'Feasibility_Approved',
        'Finance_Approved',
        'Installation_Complete',
      ],
      default: 'Pending_Distributor',
    },

    // Legacy verification compatibility
    verification: {
      status: {
        type: String,
        default: 'Pending',
      },
      verifiedAt: Date,
      verifiedBy: String,
      remarks: {
        type: String,
        default: '',
      },
    },

    // Partner (Service Provider) Workflow
    partnerDetails: {
      partnerId: { type: String, default: '' },
      partnerName: { type: String, default: '' },
      status: {
        type: String,
        enum: ['Unassigned', 'Assigned', 'Feasibility_Approved', 'Feasibility_Rejected'],
        default: 'Unassigned',
      },
      assignedAt: Date,
      feasibilityNotes: { type: String, default: '' },
    },

    // Financer Workflow
    financingDetails: {
      required: { type: Boolean, default: false },
      financerId: { type: String, default: '' },
      financerName: { type: String, default: '' },
      status: {
        type: String,
        enum: ['Not_Required', 'Pending', 'Approved', 'Rejected', 'Disbursed'],
        default: 'Not_Required',
      },
      loanAmount: { type: Number, default: 0 },
      remarks: { type: String, default: '' },
    },

    // Installer Workflow
    installerDetails: {
      installerId: { type: String, default: '' },
      installerName: { type: String, default: '' },
      installerPhone: { type: String, default: '' },
      status: {
        type: String,
        enum: ['Unassigned', 'Assigned', 'In_Progress', 'Completed'],
        default: 'Unassigned',
      },
      assignedAt: Date,
      completedAt: Date,
      serialNumbers: { type: String, default: '' },
      proofPhoto: { type: String, default: '' },
    },

    // Consumer login account credentials generated by Agent
    consumerAccount: {
      loginId: { type: String, default: '' },
      tempPassword: { type: String, default: '' },
      accountCreatedAt: Date,
    },

    // Registration Fee & Payment Receipt
    paymentDetails: {
      amount: { type: Number, default: 500 },
      mode: { type: String, default: 'UPI' },
      transactionId: { type: String, default: '' },
      paymentScreenshotUrl: { type: String, default: '' },
      receiptNumber: { type: String, default: '' },
      paymentDate: { type: Date, default: Date.now },
      collectedByAgentName: { type: String, default: '' },
      collectedByAgentId: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', applicationSchema, process.env.COLLECTION_APPLICATIONS || 'applications');
