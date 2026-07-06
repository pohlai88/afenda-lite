/**
 * Client portal writing surface.
 *
 * Audience: business clients who sign in, declare who they are, and submit
 * attestations. Link recipients complete declarations without an account.
 *
 * Avoid: operator, admin, issue, distribute, feedback, survey.
 */

export const PORTAL_NAME = "Client Declaration Portal";

export const portalCopy = {
  product: {
    name: PORTAL_NAME,
    tagline: "Sign in, declare, and submit with confidence",
    portalEyebrow: "Client portal",
    declarationEyebrow: "Declaration",
    secureAccessEyebrow: "Secure access",
  },

  signIn: {
    title: "Sign in",
    description: "Confirm who you are to access your declarations.",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    heroTitle: "Your identity. Your declaration.",
    heroDescription:
      "Sign in with your business credentials to complete declarations, submit attestations, and review your activity.",
    steps: [
      { label: "Sign in", detail: "Authenticate with your business account." },
      { label: "Declare", detail: "Complete the declaration presented to you." },
      { label: "Submit", detail: "Send your attestation securely." },
    ] as const,
    footer: "Protected client access",
    accessDenied:
      "Your account is signed in but does not have access to this portal. Try a different account or contact your administrator.",
    invalidCredentials: "Email or password is incorrect.",
    needAccount: "Need an account?",
    createAccount: "Create account",
  },

  accessDenied: {
    title: "Access not granted",
    description:
      "This portal is limited to authorized operators. Contact your administrator if you need access.",
  },

  notFound: {
    title: "Page not found",
    description:
      "The page you requested does not exist or may have been removed.",
    backLabel: "Back to sign in",
  },

  account: {
    eyebrow: "Client portal",
    title: "Your declarations",
    description:
      "Manage declaration forms, share access links, and review submissions.",
    stats: {
      declarations: {
        title: "Declarations",
        detail: "Active forms available to share.",
      },
      submissions: {
        title: "Submissions",
        detail: "Declarations completed via your links.",
      },
      average: {
        title: "Average score",
        detail: "Mean rating across declarations with submissions.",
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
      description: "Share access links and review submissions.",
      empty: "No declarations yet. Create one to get a shareable link.",
      submissions: (count: number) =>
        count === 1 ? "1 submission" : `${count} submissions`,
      viewSubmissions: "View submissions",
      inviteClients: "Invite clients",
    },
  },

  declarationDetail: {
    eyebrow: "Declaration",
    backLabel: "Your declarations",
    share: {
      title: "Share access",
      description: "Copy an open link or a secure link for recipients.",
    },
    submissions: {
      title: "Submissions",
      description: "Declarations completed through your shared links.",
      empty: "No submissions yet. Share a link to start collecting declarations.",
      rating: (value: number) => `Score ${value}/5`,
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
  },

  declarationForm: {
    yesLabel: "Yes",
    noLabel: "No",
    textPlaceholder: "Enter your response…",
    fileHint: "Select a file to register its details",
    fileNote: "Metadata only — the file is not uploaded. Your operator receives the filename and type.",
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
    qrAlt: "QR code for secure declaration link",
    qrHint: "Scan to open the declaration. Sign-in is not required.",
    copiedLink: "Secure link copied.",
    copiedEmail: "Email message copied. Paste into your mail app.",
    copiedWhatsApp: "WhatsApp message copied. Paste into your chat.",
    newLinkGenerated: "New secure link issued.",
    copyPublicLink: "Copy open link",
    copiedPublicLink: "Open link copied.",
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

  clientAuth: {
    eyebrow: "Client access",
    title: "Client sign in",
    description: "Sign in to complete assigned declarations.",
    submit: "Sign in",
    submitting: "Signing in…",
    invalidCredentials: "Email or password is incorrect.",
    operatorLink: "Operator sign in",
    inviteHint: "Invited by your operator? Open the invitation link they sent you.",
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
    issueDescription: "Send a secure invitation link and optionally assign a declaration.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Alex Morgan",
    issueSubmit: "Issue invitation",
    issueError: "Enter a valid email and full name.",
    assignLabel: "Assign declaration (optional)",
    assignPlaceholder: "No assignment yet",
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
    eyebrow: "Client portal",
    title: "Your assignments",
    description: "Declarations assigned to you by your operator.",
    pending: "Pending",
    submitted: "Submitted",
    complete: "Complete declaration",
    viewReceipt: "View receipt",
    empty: "No assignments yet. Your operator will invite you when a declaration is ready.",
    assignmentNotFound: "Assignment not found.",
    alreadySubmitted: "This declaration has already been submitted.",
    receiptTitle: "Submission receipt",
    receiptDescription: "Keep this confirmation code for your records.",
    dueLabel: (date: string) => `Due ${date}`,
  },
} as const;
