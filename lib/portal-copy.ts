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
    },
  },

  declarationDetail: {
    eyebrow: "Declaration",
    backLabel: "Declaration management",
    share: {
      title: "Share access",
      description: "Copy an open link or a secure link for recipients.",
    },
    emailLog: {
      title: "Recorded invitations",
      description: "Email addresses recorded for this declaration.",
      empty: "No email invitations recorded yet.",
    },
    submissions: {
      title: "Submissions",
      description: "Declarations completed through your shared links.",
      empty: "No submissions yet. Share a link to start collecting declarations.",
      answersTitle: "Answers",
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
    requiredField: (label: string) => `Complete required field: ${label}`,
    submitError: "Could not submit. Check your answers and try again.",
    submit: "Submit declaration",
    submitting: "Submitting…",
    thankYouTitle: "Declaration received",
    thankYouDescription:
      "Your submission has been recorded. You may close this page.",
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
    eyebrow: "Profile",
    title: "Complete your profile",
    description: "Tell us about your business before submitting declarations.",
    phoneLabel: "Phone",
    phonePlaceholder: "+1 555 0100",
    entityLabel: "Entity name",
    entityPlaceholder: "Acme Holdings Ltd",
    jurisdictionLabel: "Jurisdiction",
    jurisdictionPlaceholder: "Singapore",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Any context your reviewer should know…",
    submit: "Save and continue",
    submitting: "Saving…",
    requiredError: "Phone, entity name, and jurisdiction are required.",
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
