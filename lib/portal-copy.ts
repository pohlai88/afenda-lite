/**
 * Client portal writing surface.
 *
 * Audiences:
 * - Clients: sign in at `/`, complete assigned declarations at `/client/*`
 * - Organization users: sign in at `/org/login`, manage at `/dashboard/*`
 * - Link recipients: open/secure declaration links without an account
 */

export const PORTAL_NAME = "Client Declaration Portal";
const CLIENT_PORTAL_EYEBROW = "Client portal";
const ORG_EYEBROW = "Organization";

export const portalCopy = {
  product: {
    name: PORTAL_NAME,
    tagline: "Sign in, declare, and submit with confidence",
    portalEyebrow: CLIENT_PORTAL_EYEBROW,
    declarationEyebrow: "Declaration",
    secureAccessEyebrow: "Secure access",
  },

  errors: {
    declarationNotFound: "Declaration not found.",
    emailPasswordRequired: "Email and password are required.",
    titleRequired: "Title is required.",
  },

  signIn: {
    title: "Sign in",
    description: "Confirm who you are to access your assigned declarations.",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    showPassword: "Show password",
    hidePassword: "Hide password",
    heroTitle: "Your identity. Your declaration.",
    heroDescription:
      "Sign in with your business credentials to complete assigned declarations and review your submissions.",
    steps: [
      { label: "Sign in", detail: "Authenticate with your business account." },
      { label: "Declare", detail: "Complete the declaration assigned to you." },
      { label: "Submit", detail: "Send your attestation securely." },
    ] as const,
    footer: "Protected client access",
    inviteHint:
      "Invited to the portal? Open the invitation link sent to your email.",
    orgLink: "Organization sign in",
    needAccount: "Need an account?",
    createAccount: "Create account",
    invalidCredentials: "Email or password is incorrect.",
  },

  orgSignIn: {
    title: "Organization sign in",
    description:
      "Sign in to manage declarations, share access links, and review submissions.",
    heroTitle: "Manage declarations for your organization",
    heroDescription:
      "Create declaration forms, invite clients, distribute secure links, and review submissions.",
    steps: [
      { label: "Sign in", detail: "Use your organization credentials." },
      { label: "Configure", detail: "Create declarations and assign clients." },
      { label: "Review", detail: "Track submissions from your dashboard." },
    ] as const,
    footer: "Authorized organization access",
    clientLink: "Client sign in",
    accessDenied:
      "This account does not have organization access. Use client sign in or contact your administrator.",
    invalidCredentials: "Email or password is incorrect.",
  },

  accessDenied: {
    title: "Access not granted",
    description:
      "This area is limited to authorized organization users. Use client sign in or contact your administrator.",
  },

  notFound: {
    title: "Page not found",
    description:
      "The page you requested does not exist or may have been removed.",
    backLabel: "Back to sign in",
    backLabelClient: "Back to your assignments",
    backLabelOrg: "Back to declaration management",
  },

  nav: {
    declarations: "Declarations",
    clientInvitations: "Client invitations",
    previewClientPortal: "Preview client portal",
    playground: "Playground",
    assignments: "Your assignments",
    account: "Account",
    organization: "Organization",
  },

  previewClient: {
    openPortal: "Preview client portal",
    opening: "Opening preview…",
    bannerTitle: "Preview mode",
    bannerDescription:
      "You are viewing the client portal with the preview account.",
    returnToOrg: "Return to organization",
    notConfigured:
      "Preview client is not configured. Set PREVIEW_CLIENT_EMAIL and PREVIEW_CLIENT_PASSWORD, then run npm run seed:preview-client.",
    signInFailed:
      "Could not open the preview client portal. Check preview credentials and seed data.",
  },

  trust: {
    meta: {
      titleSuffix: "Secure declaration portal",
      defaultDescription:
        "Sign in, complete assigned declarations, and submit attestations through a secure client portal with organization-managed access.",
      keywords: [
        "declaration portal",
        "client attestations",
        "secure submissions",
        "compliance",
      ] as const,
    },
    pillars: [
      {
        title: "Authenticated access",
        detail:
          "Clients and organization users sign in with verified credentials before accessing declarations.",
      },
      {
        title: "Metadata-only file evidence",
        detail:
          "File questions record filename and type only. Original files are not uploaded to the portal.",
      },
      {
        title: "Audit trail",
        detail:
          "Sign-in, invitation, and declaration events are recorded for organizational review.",
      },
    ] as const,
    footer: {
      line: "Secure declaration portal",
      complianceNote:
        "Protected access · Encrypted transport · Organization-managed declarations",
    },
    notices: {
      clientLogin:
        "Sign in with credentials issued by your organization. Do not share your password.",
      orgLogin:
        "Organization access is limited to authorized operators. Client accounts cannot access this area.",
      declarationForm:
        "Submit only information you are authorized to declare. Submissions are recorded with a confirmation code.",
    },
  },

  org: {
    eyebrow: ORG_EYEBROW,
    title: "Declaration management",
    description:
      "Create declarations, invite clients, share access links, and review submissions.",
    stats: {
      declarations: {
        title: "Declarations",
        detail: "Active forms available to share.",
      },
      submissions: {
        title: "Submissions",
        detail: "Declarations completed via your links.",
      },
      pendingAssignments: {
        title: "Pending assignments",
        detail: "Client declarations awaiting completion.",
      },
    },
    create: {
      title: "New declaration",
      description: "Add a title, optional intro, and dynamic questions.",
      titleLabel: "Title",
      titlePlaceholder: "Q2 service declaration",
      titleRequired: "Title is required.",
      introLabel: "Intro (optional)",
      introPlaceholder: "Brief context shown above the questions.",
      submit: "Create declaration",
      submitting: "Creating…",
    },
    list: {
      title: "Declarations",
      description: "Open a declaration to share links and review submissions.",
      empty: "No declarations yet. Create one to get a shareable link.",
      submissions: (count: number) =>
        count === 1 ? "1 submission" : `${count} submissions`,
      viewSubmissions: "View submissions",
      shareAccess: "Share access",
      inviteClients: "Invite clients",
      tableTitle: "Declaration",
      tableSubmissions: "Submissions",
      tableActions: "Actions",
    },
  },

  declarationDetail: {
    eyebrow: "Declaration",
    backLabel: "Declaration management",
    share: {
      title: "Share access",
      description: "Copy an open link or a secure link for recipients.",
    },
    tabs: {
      manage: "Settings",
      share: "Share",
      submissions: "Submissions",
      danger: "Delete",
    },
    emailLog: {
      title: "Recorded invitations",
      description: "Email addresses recorded for this declaration.",
      empty: "No email invitations recorded yet.",
      tableEmail: "Email",
      tableSent: "Sent",
    },
    submissions: {
      title: "Submissions",
      description: "Declarations completed through your shared links.",
      empty: "No submissions yet. Share a link to start collecting declarations.",
      answersTitle: "Answers",
      tableCode: "Confirmation",
      tableSubmitted: "Submitted",
    },
    manage: {
      title: "Declaration settings",
      description: "Update the title, intro, and questions.",
      titleLabel: "Title",
      introLabel: "Intro (optional)",
      questionLabel: "Declaration prompt",
      save: "Save changes",
      deleteTitle: "Delete declaration",
      deleteDescription:
        "Permanently removes this declaration and all submissions.",
      deleteConfirm:
        "Delete this declaration and all submissions? This cannot be undone.",
      deleteCancel: "Cancel",
      deleteSubmit: "Delete declaration",
    },
  },

  declarationPage: {
    publicDescription:
      "Complete this declaration without signing in. Include only information you are comfortable sharing.",
    secureTitle: "Complete your declaration",
    secureDescription:
      "You opened a secure declaration link. We do not collect your name, email, or contact details unless you include them in your note.",
    secureFormNote:
      "Secure submission. Add business context in your note only if appropriate.",
    skipLink: "Skip to declaration",
    questionsNotConfigured:
      "This declaration has no questions yet. Contact your organization to finish setup.",
  },

  declarationForm: {
    yesLabel: "Yes",
    noLabel: "No",
    textPlaceholder: "Enter your response…",
    fileHint: "Select a file to register its details",
    fileNote:
      "Metadata only — the file is not uploaded. Your organization receives the filename and type.",
    fileRequired: "Choose a file to register.",
    fileInvalid: "Register the file before submitting.",
    fileUploading: "Uploading…",
    requiredFieldError: "This field is required.",
    requiredField: (label: string) => `Complete required field: ${label}`,
    submitError: "Could not submit. Check your answers and try again.",
    submit: "Submit declaration",
    submitting: "Submitting…",
    thankYouTitle: "Declaration received",
    thankYouDescription:
      "Your submission has been recorded. You may close this page.",
    wizard: {
      stepAttestationsTitle: "Attestations",
      stepAttestationsDescription:
        "Answer each yes/no statement accurately. These responses form part of your declaration.",
      stepTextTitle: "Additional information",
      stepTextDescription:
        "Provide open responses where requested. Include only information you are authorized to declare.",
      stepFileTitle: "Supporting documents",
      stepFileDescription:
        "Register file details for each question. Original files are not uploaded to the portal.",
      stepReviewTitle: "Review and submit",
      stepReviewDescription:
        "Confirm your answers before submitting your declaration.",
      stepProgress: (current: number, total: number) =>
        `Step ${current} of ${total}`,
      previous: "Previous",
      next: "Continue",
      reviewSummaryTitle: "Your responses",
      reviewAttestationSwitch:
        "I have reviewed my responses and confirm they are accurate.",
      reviewAttestationRequired:
        "Confirm your responses before submitting.",
      unanswered: "Not answered",
    },
  },

  questions: {
    editorLabel: "Questions",
    editorHint: "Yes/no, text, and file-reference questions for recipients.",
    promptPlaceholder: "Enter the question prompt…",
    addQuestion: "Add question",
    removeQuestion: "Remove question",
    requiredLabel: "Required",
    emptyError: "Add at least one question.",
    types: {
      yesNo: "Yes / No",
      text: "Text",
      file: "File reference",
    },
  },

  share: {
    title: "Share access",
    description: "Secure links hide declaration details in the URL.",
    publicLabel: "Open link",
    privateLabel: "Secure link",
    copyLink: "Copy secure link",
    copyEmail: "Copy for email",
    copyWhatsApp: "Copy for WhatsApp",
    newLink: "Rotate secure link",
    newLinkPolicy:
      "Rotating a secure link invalidates previous secure links for this declaration.",
    qrAlt: "QR code for secure declaration link",
    qrHint: "Scan to open the declaration. Sign-in is not required.",
    copiedLink: "Secure link copied.",
    copiedEmail: "Email message copied. Paste into your mail app.",
    copiedWhatsApp: "WhatsApp message copied. Paste into your chat.",
    newLinkGenerated: "New secure link issued. Previous secure links no longer work.",
    copyPublicLink: "Copy open link",
    copiedPublicLink: "Open link copied.",
    loadingLink: "Preparing secure link…",
    regenerateConfirmTitle: "Rotate Secure Link?",
    regenerateConfirmDescription:
      "Previous secure links will stop working immediately. Copy and share the new link with recipients who still need access.",
    regenerateCancel: "Keep Current Link",
  },

  invite: {
    sender: "Client Declaration Portal",
    emailSubject: "Declaration request",
    emailLabel: "Recipient email",
    emailPlaceholder: "client@company.com",
    recordAndCopy: "Record & copy for email",
    recorded: "Invitation recorded and email message copied.",
    recordError: "Enter a valid email address.",
    emailBody: (url: string) =>
      [
        "Hello,",
        "",
        "You are invited to complete a declaration through our secure portal.",
        "No account is required. We do not collect your name, email, or contact details by default.",
        "",
        url,
        "",
        `— ${portalCopy.invite.sender}`,
      ].join("\n"),
    whatsApp: (url: string) =>
      [
        "Declaration request",
        "",
        "Please complete your declaration at the link below:",
        url,
      ].join("\n"),
  },

  clientInvitationsPage: {
    eyebrow: ORG_EYEBROW,
    title: "Client invitations",
    description: "Issue secure client accounts and assign declarations.",
    recentTitle: "Recent invitations",
    recentDescription: "Pending and accepted client invites.",
    assignmentsTitle: "Client assignments",
    assignmentsDescription: "Declarations assigned to invited clients.",
    assignmentsEmpty: "No assignments yet.",
    empty: "No client invitations yet.",
    openInvite: "Open invite link",
    tableName: "Name",
    tableEmail: "Email",
    tableStatus: "Status",
    tableActions: "Actions",
    tableDeclaration: "Declaration",
    tableClient: "Client",
    tableDue: "Due date",
    status: {
      pending: "Pending",
      accepted: "Accepted",
      expired: "Expired",
    },
  },

  clientInvite: {
    eyebrow: "Invitation",
    title: "Accept invitation",
    description: "Set a password to activate your client account.",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    submit: "Activate account",
    submitting: "Activating…",
    missingToken: "Missing invitation token.",
    invalidToken: "This invitation link is invalid or does not exist.",
    expired: "This invitation has expired. Contact your administrator.",
    alreadyAccepted: "This invitation has already been used. Sign in instead.",
    weakPassword: "Password must be at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    acceptFailed: "Could not activate your account. Try again or contact support.",
    issueTitle: "Invite client",
    issueDescription:
      "Send a secure invitation link and optionally assign a declaration.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Alex Morgan",
    issueSubmit: "Issue invitation",
    issueError: "Enter a valid email and full name.",
    assignLabel: "Assign declaration (optional)",
    assignPlaceholder: "No assignment yet",
    dueDateLabel: "Due date (optional)",
    issued: "Invitation created. Copy the link below.",
    copyInvite: "Copy invitation link",
    copiedInvite: "Invitation link copied.",
  },

  clientOnboarding: {
    eyebrow: "Declarant profile",
    title: "Establish your declarant identity",
    description:
      "Before you can complete assigned declarations, confirm the legal entity and jurisdiction under which you attest. This profile is linked to your submissions and reviewed by your organization.",
    progressTitle: "Setup progress",
    progressDescription:
      "Your organization requires a complete declarant profile before you can access or submit assigned declarations.",
    legalNoticeTitle: "Legal notice",
    legalNotice: [
      "You must provide accurate identity, entity, and contact details. False or misleading information may affect the validity of your declarations and your organization's review.",
      "Passport and residence information is processed solely to verify declarant identity for declaration review. It is not used for marketing.",
      "By saving this profile, you confirm you are authorized to declare on behalf of the legal entity named below, or as an individual declarant where applicable.",
      "Declaration submissions are recorded with a confirmation code and retained for organizational review and audit.",
    ] as const,
    dataCollectionTitle: "What we collect and why",
    dataCollectionIntro:
      "This portal collects identity and entity information needed to verify who is declaring, assign declarations, and contact you about them.",
    dataCollectionItems: [
      {
        field: "Account email",
        purpose:
          "Issued when you accepted your invitation. Used to sign in and link submissions to your account.",
      },
      {
        field: "Full legal name",
        purpose:
          "Self-attested name as it appears on official identity documents. Shown on submission records.",
      },
      {
        field: "Nationality and country of residence",
        purpose:
          "Citizenship and primary residence for jurisdictional review of your declarations.",
      },
      {
        field: "Passport issuing country and number",
        purpose:
          "Identity verification for organizational review. Stored securely; not used for marketing.",
      },
      {
        field: "Phone number",
        purpose:
          "Declaration-related contact from your organization. Not used for marketing.",
      },
      {
        field: "Legal entity name",
        purpose:
          "Identifies the organization or person making declarations on this account.",
      },
      {
        field: "Governing jurisdiction",
        purpose:
          "The country or region whose laws govern your declarations and organizational review.",
      },
      {
        field: "Notes (optional)",
        purpose:
          "Additional context for your reviewer, such as trading names or group structure.",
      },
    ] as const,
    dataCollectionFooter:
      "Your password was set when you activated your account. Declaration answers are collected separately when you complete each assignment.",
    policyNoticeTitle: "Your responsibilities",
    policyNotice: [
      "Submit only information you are authorized to declare.",
      "Do not share your sign-in credentials. Access is limited to your organization-issued account.",
      "Sign-in, invitation, profile, and declaration events may be recorded in an audit trail for organizational review.",
    ] as const,
    formTitle: "Declarant profile details",
    formDescription:
      "Complete all required sections below. Identity and entity details are stored with your account for as long as your organization retains declaration records.",
    credentialsSectionTitle: "Account credentials",
    credentialsSectionDescription:
      "Your sign-in credentials were established when you accepted your invitation.",
    emailLabel: "Email address",
    passwordSetNotice:
      "Your password was set when you activated your account. It is not collected again on this form.",
    identitySectionTitle: "Personal identity",
    identitySectionDescription:
      "Confirm your legal name and residence. These details verify who is making declarations on this account.",
    fullLegalNameLabel: "Full legal name",
    fullLegalNameDescription:
      "As it appears on your passport or national identity document. Confirm or correct the name from your invitation.",
    fullLegalNamePlaceholder: "Alex Morgan",
    nationalityLabel: "Nationality",
    nationalityDescription:
      "Country of citizenship (ISO country code).",
    countryOfResidenceLabel: "Country of residence",
    countryOfResidenceDescription:
      "Your primary country of tax or legal residence.",
    additionalResidenceLabel: "Additional countries of residence (optional)",
    additionalResidenceDescription:
      "Select any other countries where you have tax or legal residence relevant to your declarations.",
    countrySelectPlaceholder: "Select country",
    passportSectionTitle: "Passport details",
    passportSectionDescription:
      "Required for identity verification. Document scans are not uploaded — enter details as printed on your passport.",
    passportCountryLabel: "Passport issuing country",
    passportCountryDescription:
      "Country that issued your passport.",
    passportNumberLabel: "Passport number",
    passportNumberDescription:
      "As printed on your passport. Stored securely for organizational review only.",
    passportNumberPlaceholder: "E1234567",
    identityConsentLabel:
      "I confirm this identity information is accurate and authorize its processing for declaration review by my organization.",
    contactSectionTitle: "Contact",
    contactSectionDescription:
      "Your organization may use this to reach you about due dates, clarifications, or follow-up on assigned declarations.",
    entitySectionTitle: "Legal entity",
    entitySectionDescription:
      "The organization or person making declarations on this account. Incorrect entity details may affect organizational review of your attestations.",
    phoneLabel: "Phone number",
    phoneDescription:
      "Include country code. Required for declaration-related contact only — not for marketing or unrelated outreach.",
    phonePlaceholder: "+65 9123 4567",
    entityLabel: "Legal entity name",
    entityDescription:
      "Use the registered legal name as it appears on official records or filings. This name is shown on your submission records.",
    entityPlaceholder: "Acme Holdings Pte. Ltd.",
    jurisdictionLabel: "Governing jurisdiction",
    jurisdictionDescription:
      "Country or region whose laws govern your declarations and review (e.g. Singapore, US-CA, England & Wales). Your organization's requirements may depend on applicable local law.",
    jurisdictionPlaceholder: "Singapore",
    notesLabel: "Notes for your reviewer",
    notesDescription:
      "Optional. Trading names, group structure, or other context your reviewer should know before reviewing submissions. Do not include sensitive personal data unrelated to the declaration.",
    notesPlaceholder:
      "e.g. Declarations made on behalf of Acme Asia subsidiary…",
    steps: [
      {
        id: "invitation-accepted",
        title: "Accept invitation",
        statusLabel: "Completed",
        content: "Your portal account was activated from your invitation link.",
        state: "done" as const,
      },
      {
        id: "authenticated",
        title: "Sign in",
        statusLabel: "Completed",
        content: "You are signed in with credentials issued by your organization.",
        state: "done" as const,
      },
      {
        id: "declarant-profile",
        title: "Complete declarant profile",
        statusLabel: "In progress",
        content:
          "Review the legal notice and data collection summary, then confirm your identity, legal entity, and contact details.",
        state: "current" as const,
      },
      {
        id: "assignments",
        title: "Review assignments",
        statusLabel: "Upcoming",
        content:
          "After saving your profile, your assigned declarations will appear here for completion and attestation.",
        state: "upcoming" as const,
      },
    ] as const,
    submit: "Save and continue",
    submitting: "Saving…",
    requiredError:
      "Complete all required identity, passport, entity, and contact fields and confirm the accuracy statement.",
  },

  clientDashboard: {
    eyebrow: CLIENT_PORTAL_EYEBROW,
    title: "Your assignments",
    description: "Declarations assigned to you by your organization.",
    pending: "Pending",
    submitted: "Submitted",
    complete: "Complete declaration",
    viewReceipt: "View receipt",
    empty:
      "No assignments yet. Your organization will invite you when a declaration is ready.",
    assignmentNotFound: "Assignment not found.",
    alreadySubmitted: "This declaration has already been submitted.",
    receiptTitle: "Submission receipt",
    receiptDescription: "Keep this confirmation code for your records.",
    dueLabel: (date: string) => `Due ${date}`,
    signOut: "Sign out",
    backToAssignments: "Back to assignments",
  },

  metadata: {
    home: {
      title: "Sign in",
      description: "Confirm who you are to access your assigned declarations.",
    },
    orgLogin: {
      title: "Organization sign in",
      description: "Sign in to manage declarations and review submissions.",
    },
    client: {
      title: "Your assignments",
      description: "Declarations assigned to you.",
    },
    dashboard: {
      title: "Declaration management",
      description: "Manage declarations, clients, and submissions.",
    },
  },
} as const;

/** @deprecated Use org */
export const account = portalCopy.org;
