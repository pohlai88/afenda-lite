/**
 * Client portal writing surface.
 *
 * Audiences:
 * - Clients: sign in at `/`, complete assigned declarations at `/client/*`
 * - Organization users: sign in at `/org/login`, manage at `/dashboard/*`
 */

export const PORTAL_NAME = "Client Declaration Portal";
export const CLIENT_PORTAL_ACK_VERSION = "2026-01";
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
    signInRequired: "Sign in to complete this declaration.",
    questionsLocked:
      "Questions cannot be changed after clients have submitted responses.",
    routeBoundary: {
      root: {
        description:
          "We could not complete this request. You can try again or return to sign in.",
        backLabel: "Back to sign in",
      },
      client: {
        description:
          "We could not load this client page. You can try again or return to your dashboard.",
        backLabel: "Back to dashboard",
      },
      operator: {
        description:
          "We could not load this organization page. You can try again or return to the dashboard.",
        backLabel: "Back to dashboard",
      },
      account: {
        description:
          "We could not load account settings. Try again or return to sign in.",
        backLabel: "Back to sign in",
      },
    },
    globalBoundary: {
      title: "Application error",
      description:
        "A critical error occurred. Please reload the page or try again later.",
      retryLabel: "Try again",
    },
  },

  signIn: {
    title: "Access Vault",
    description: "Confirm who you are to access your assigned declarations.",
    emailLabel: "Email",
    emailPlaceholder: "name@organization.com…",
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
      "Already completed your invitation? Sign in with the email and password you created.",
    orgLink: "Organization sign in",
    checkEmailHint:
      "Open the invitation link in your email to create your account — do not use the general sign-in page first.",
    inviteExpiredHint:
      "This invitation has expired. Contact your organization to register again.",
    inviteInvalidHint:
      "This invitation link is not valid. Sign in if you already registered, or contact your organization.",
    loginRequiredHint: "Sign in to access declarations assigned to your account.",
    invalidCredentials: "Email or password is incorrect.",
  },

  emailOtp: {
    label: "Verification code",
    oneTimePasswordLabel: "One-time verification code",
    signInDescription:
      "Enter your email. We will send a six-digit code to confirm your identity.",
    signUpVerificationNotice:
      "After sign-up, check your inbox for a verification code from our secure auth service.",
    codeSentNotice:
      "Check your inbox for a six-digit verification code. It may take a minute to arrive.",
    sendCodeAction: "Send verification code",
    verifyCodeAction: "Verify and continue",
    sendVerificationCodeAction: "Send verification code",
    resendCodeAction: "Resend code",
    enterCodeDescription: "Enter the six-digit code from your email to continue.",
    forgotPasswordDescription:
      "Enter your email. We will send a verification code to reset your password.",
    sendResetCodeAction: "Send reset code",
    trustNotice:
      "Codes are sent from our secure auth service. Do not share verification codes with anyone.",
    rateLimitHint:
      "Too many attempts? Wait a few minutes, then request a new code.",
  },

  organizationAuth: {
    acceptInvitationTitle: "Accept invitation",
    acceptInvitationDescription:
      "Confirm below to join your organization and access assigned declarations.",
    acceptInvitationSuccess: "You have joined your organization.",
    inviteMemberDescription:
      "Invite a client with the email address they will use to sign in.",
    sendInvitationAction: "Send invitation",
    sendInvitationSuccess: "Invitation sent. The client will receive an email with next steps.",
    trustNotice:
      "Invitations are tied to the invited email address. Clients must sign up with that exact address before accepting.",
    pendingInvitationsDescription:
      "Pending client invitations for your organization workspace.",
    invitationExpired: "This invitation has expired. Contact your organization to register again.",
  },

  magicLink: {
    label: "Email link",
    signInDescription:
      "Enter your email. We will send a secure sign-in link that expires in 15 minutes.",
    sendLinkAction: "Send sign-in link",
    linkSentNotice:
      "Check your inbox for a sign-in link from our secure auth service. The link expires in 15 minutes.",
    trustNotice:
      "Sign-in links are single-use and time-limited. Do not forward them or open links on shared devices.",
    existingUsersOnlyHint:
      "Magic links work for existing accounts. New clients should use their organization invitation email.",
  },

  passwordReset: {
    forgotDescription:
      "Enter your email. We will send a secure reset link that expires in 15 minutes.",
    resetDescription: "Choose a new password for your account.",
    linkSentNotice:
      "Check your inbox for a password reset link from our secure auth service. The link expires in 15 minutes.",
    trustNotice:
      "Reset links are single-use and time-limited. Do not forward them or open links on shared devices.",
    noAccountHint:
      "No account yet? Use your organization invitation email to sign up first — password reset only works for existing accounts.",
  },

  orgSignIn: {
    title: "Organization sign in",
    description:
      "Sign in to manage declarations, share access links, and review submissions.",
    heroTitle: "Manage declarations for your organization",
    heroDescription:
      "Create declaration forms, invite clients, and review signed-in submissions.",
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
    clientInvitations: "Clients",
    previewClientPortal: "Preview client portal",
    playground: "Playground",
    assignments: "Your assignments",
    account: "Account",
    accountSecurity: "Security",
    organization: "Organization",
  },

  userMenu: {
    signedInAs: "Signed in as",
    accountSettings: "Account settings",
    accountSecurity: "Security",
  },

  account: {
    skipLink: "Skip to account content",
    backToDashboard: "Declaration management",
    settings: {
      title: "Account settings",
      description: "Manage your profile, display name, and account details.",
    },
    security: {
      title: "Security & password",
      description: "Update your password and review active sessions.",
    },
    management: {
      displayNameLabel: "Display name",
      displayNameDescription:
        "Shown in your account menu and operator workspace.",
      displayNamePlaceholder: "Display name",
      profileUpdated: "Profile updated successfully.",
      changePasswordTitle: "Change password",
      changePasswordDescription:
        "Enter your current password and choose a new one. Saving signs out other devices.",
      changePasswordInstructions: "Use at least 8 characters.",
      changePasswordSuccess: "Password changed successfully.",
      currentPasswordLabel: "Current password",
      currentPasswordPlaceholder: "Current password",
      newPasswordLabel: "New password",
      newPasswordPlaceholder: "New password",
    },
    sectionNavLabel: "Account sections",
  },

  clientNav: {
    sectionLabel: "Portal",
    declarantProfile: "Declarant profile",
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
    notConfiguredTitle: "Preview not available",
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
    vaultSignals: [
      "Encrypted transport",
      "Verified access",
      "Audit recorded",
    ] as const,
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
      description:
        "The server assigns a tracking ID immediately. Open settings to upload your AI-generated JSON — title, case number, questions, and assignments all come from the file.",
      hint: "No title or case number needed here. Upload JSON in settings after creating.",
      openSettings: "Create & open settings",
      submitting: "Creating…",
    },
    list: {
      title: "Declarations",
      description:
        "Open a declaration for settings, JSON import, sharing, and submissions.",
      draftTitle: (id: string) => `Draft · ${id}`,
      empty: "No declarations yet. Create one to get a shareable link.",
      emptyTitle: "No declarations yet",
      emptyDescription: "Create your first declaration to generate a shareable link.",
      emptyAction: "Create declaration",
      submissions: (count: number) =>
        count === 1 ? "1 submission" : `${count} submissions`,
      openSettings: "Settings & import",
      settings: "Settings",
      viewSubmissions: "View submissions",
      shareAccess: "Share access",
      inviteClients: "Register clients",
      tableTitle: "Declaration",
      tableCase: "Case",
      tableCaseEmpty: "—",
      tableDraftHint: "Upload JSON in settings to fill details.",
      tableSubmissions: "Submissions",
      tableActions: "Actions",
    },
  },

  declarationDetail: {
    eyebrow: "Declaration",
    backLabel: "Declaration management",
    metadata: {
      title: "Case details",
      description:
        "System declaration ID, reference identifiers, parties, purpose, and deadlines.",
      declarationId: "Declaration ID",
      declarationIdHint:
        "System-assigned UUID for this declaration. Use reference or case number for your own identifiers.",
      referenceNumber: "Reference number",
      caseNumber: "Case number",
      effectiveDate: "Effective date",
      submitBefore: "Submit before",
      surveyorTitle: "Surveyor (principal)",
      surveyorName: "Surveyor name",
      surveyorOrg: "Surveyor organization",
      surveyeeTitle: "Surveyee (declarant)",
      surveyeeIndividual: "Individual name",
      surveyeeOrg: "Organization name",
      purpose: "Purpose",
      purposePlaceholder: "Why this declaration is required…",
      categories: "Categories",
      categoriesHint: "Comma-separated labels (e.g. KYC, compliance, annual)",
      categoriesPlaceholder: "KYC, compliance",
      emptyValue: "Not set",
    },
    package: {
      title: "Import / export package",
      description:
        "Download or upload a CDP declaration package (.json). The format mirrors client assignment fields to reduce drift between operator setup and client delivery.",
      download: "Download package",
      downloadTemplate: "Download starter template",
      downloadTemplateHint:
        "Full CDP scaffold with all recommended audit metadata, example questions, and assignment block. Replace example values before ingest.",
      aiPromptTitle: "Use with an AI assistant",
      aiPromptDescription:
        "Copy the prompt below into ChatGPT, Claude, Gemini, or similar. It includes the CDP v1 schema rules and starter template so the model returns upload-ready JSON.",
      aiPromptSteps: [
        "Download the starter template (optional — the prompt already embeds it).",
        "Click Copy AI prompt and paste it into your AI chat.",
        "Add your case details in the “My case details” section, or answer the model’s follow-up questions.",
        "Copy the JSON the AI returns, save as a .json file, and upload it here.",
      ],
      aiPromptPreviewLabel: "Prompt preview",
      aiPromptCopyButton: "Copy AI prompt",
      aiPromptCopiedButton: "Copied",
      aiPromptCopied: "AI prompt copied to clipboard.",
      aiPromptCopyFailed: "Could not copy. Select the preview text manually.",
      downloading: "Preparing…",
      upload: "Select package",
      uploading: "Reading file…",
      uploadHint:
        "Select a .json file. You will review validation results before ingest starts.",
      createAssignment: "Create client assignment from package",
      createAssignmentHint:
        "When the package includes assignment.clientEmail, also create a pending client assignment.",
      imported: "Package imported successfully.",
      invalidJson: "Could not parse the file. Ensure it is valid JSON.",
      invalidSchema:
        "The file is not a valid CDP declaration package (version 1.0).",
      ingestBlocked:
        "Ingest blocked. Fix required Definition of Done items before continuing.",
      reviewTitle: "Review package before ingest",
      reviewDescription:
        "Upload does not apply changes automatically. Confirm the checklist below, then start ingest.",
      startIngest: "Start ingest",
      startingIngest: "Starting…",
      cancelReview: "Cancel",
      closeComplete: "Done",
      ingestingTitle: "Ingest in progress",
      ingestingDescription:
        "Applying package changes. Please keep this window open until complete.",
      completeTitle: "Ingest complete",
      completeDescription:
        "Declaration settings were updated from the package. Review the form below.",
      confidenceLabel: "Match confidence",
      confidenceHigh: "High",
      confidenceMedium: "Medium",
      confidenceLow: "Low",
      confidenceHint:
        "Heuristic score based on schema validity and recommended metadata completeness.",
      dodTitle: "Definition of Done",
      dodRequired: "Required",
      dodRecommended: "Recommended",
      blockingTitle: "Blocking issues",
      warningsTitle: "Warnings",
      noWarnings: "No warnings.",
      summaryTitle: "Package summary",
      summaryFile: "File",
      summaryTitleField: "Declaration title",
      summaryQuestionsLabel: "Questions",
      summaryQuestions: (count: number) =>
        `${count} question${count === 1 ? "" : "s"}`,
      summaryAssignmentLabel: "Assignment",
      summaryAssignment: "Client assignment included",
      summaryNoAssignment: "No client assignment in package",
      assignmentCreated: "Client assignment created.",
      assignmentSkipped: "Assignment not created (disabled or missing email).",
      stepValidate: "Validate package",
      stepMetadata: "Apply case metadata",
      stepDeclaration: "Apply declaration & questions",
      stepAssignment: "Create client assignment",
      stepFinalize: "Finalize & audit",
      dodStatus: {
        pass: "Met",
        fail: "Failed",
        warn: "Missing",
        skip: "N/A",
      },
    },
    share: {
      title: "Client access",
      description: "Invite clients to sign in and complete assigned declarations.",
    },
    workspace: {
      submissionsTitle: "Submissions",
      questionsTitle: "Questions",
      questionsDescription: (count: number) =>
        `${count} question${count === 1 ? "" : "s"} configured`,
      deadlineTitle: "Submit before",
    },
    tabs: {
      manage: "Settings",
      manageHint: "Package, case metadata, questions, and delete",
      share: "Share",
      shareHint: "Client sign-in and invitations",
      submissions: "Submissions",
      submissionsHint: "Completed declarations",
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
      description: "Declarations completed by signed-in clients.",
      emptyTitle: "No submissions yet",
      empty: "No submissions yet. Invite a client and assign this declaration.",
      answersTitle: "Answers",
      tableCode: "Confirmation",
      tableSubmitted: "Submitted",
      viewAnswers: "View answers",
      hideAnswers: "Hide answers",
      noAnswers: "No answers recorded",
    },
    manage: {
      title: "Declaration settings",
      description: "Update case details, title, intro, and questions.",
      titleLabel: "Title",
      introLabel: "Intro (optional)",
      questionLabel: "Declaration prompt",
      save: "Save changes",
      sections: {
        package: {
          title: "Import & export",
          description:
            "Download or upload CDP packages. Upload validates first; ingest starts only when you confirm.",
        },
        caseDetails: {
          title: "Case details",
          description:
            "Declaration ID is assigned by the system. Reference and case numbers are your own identifiers.",
        },
        declaration: {
          title: "Declaration content",
          description: "Title and intro text shown to declarants.",
        },
        questions: {
          title: "Questions",
          description:
            "Yes/no, text, and file-reference questions. Expand advanced settings per question.",
        },
      },
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
    questionNumber: (n: number) => `Question ${n}`,
    promptPlaceholder: "Enter the question prompt…",
    addQuestion: "Add question",
    removeQuestion: "Remove question",
    requiredLabel: "Required",
    emptyError: "Add at least one question.",
    advancedToggle: "Advanced settings",
    helpTextLabel: "Help text",
    helpTextPlaceholder: "Shown below the question prompt…",
    placeholderLabel: "Placeholder",
    placeholderHint: "Text questions only",
    minLengthLabel: "Min length",
    maxLengthLabel: "Max length",
    types: {
      yesNo: "Yes / No",
      text: "Text",
      file: "File reference",
    },
  },

  clientInvitationJoin: {
    heroTitle: "You're invited to declare.",
    heroDescription:
      "Your organization registered you for the Client Declaration Portal. Create your account with the same email they used, then accept the invitation.",
    panelCreateTitle: "Step 1 — Create your account",
    panelCreateDescription:
      "Sign up with the email address from your invitation. If you already have an account, sign in instead.",
    panelAcceptTitle: "Step 2 — Accept invitation",
    panelAcceptDescription:
      "Confirm below to join your organization and access your assigned declarations.",
    missingInvitationError:
      "This invitation link is incomplete. Ask your administrator to resend the email.",
    trustNotice:
      "Use only the email your organization registered. Invitations cannot be accepted with a different address.",
    alternateSignInLabel: "Already have an account? Sign in",
    steps: [
      { label: "Create account", detail: "Sign up with your invited email." },
      { label: "Sign in", detail: "Use the same email to sign in after creating your account." },
      { label: "Accept invitation", detail: "Join your organization workspace." },
    ] as const,
  },

  share: {
    title: "Client access",
    description: "Share the sign-in page and temporary password with invited clients.",
    clientAccessDescription:
      "Register clients under Client invitations. When MailerSend is configured, access details are emailed automatically; otherwise copy the message below.",
    secureLinkLabel: "Secure declaration link",
    secureLinkHint:
      "Tokenized link that does not expose the declaration slug. Prefer for controlled distribution.",
    openLinkLabel: "Open declaration link",
    openLinkHint:
      "Discoverable link using the declaration slug. Share only when intentional.",
    rotateSecureLinkTitle: "Rotate secure link",
    rotateSecureLinkConfirm:
      "Generate a new secure link? The current link stops working immediately.",
    rotateSecureLinkCta: "Rotate secure link",
    rotateSecureLinkSubmit: "Rotate link",
    rotateSecureLinkCancel: "Cancel",
    clientLoginLabel: "Client sign-in URL",
    inviteClientCta: "Register client",
    qrAlt: "QR code for client sign-in",
    qrHint: "Scan to open the client sign-in page. Use the registered email and temporary password.",
  },

  clientAccess: {
    copyLabel: "Client access message",
    copyButton: "Copy access message",
    copied: "Access message copied.",
    generalLabel: "General access message (share with any registered client)",
    personalLabel: "Access message for this client",
    generalPlaceholderEmail: "your-registered-email@example.com",
    message: ({
      portalUrl,
      clientEmail,
      temporaryPassword,
    }: {
      portalUrl: string;
      clientEmail: string;
      temporaryPassword: string;
    }) =>
      [
        "Client Declaration Portal",
        "",
        `Sign in: ${portalUrl}`,
        `Email: ${clientEmail}`,
        `Temporary password: ${temporaryPassword}`,
        "",
        "First visit: complete onboarding, then open your assigned declaration.",
        "Change your password after your first sign-in.",
      ].join("\n"),
    emailSubject: "Your client portal access",
  },

  invite: {
    sender: "Client Declaration Portal",
    emailSubject: "Declaration request",
    emailLabel: "Recipient email",
    emailPlaceholder: "client@company.com",
    recordAndCopy: "Record & copy for email",
    recordAndSend: "Record & send email",
    recorded: "Invitation recorded and email message copied.",
    recordedAndSent: "Invitation recorded and email sent.",
    recordedSendFailed:
      "Invitation recorded, but the email could not be sent. Copy the message below.",
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
    title: "Client registrations",
    description:
      "Register clients with a temporary password and required declaration assignment. Access email sends automatically when MailerSend is configured.",
    recentTitle: "Registered clients",
    recentDescription:
      "Portal accounts created by your team. Access email is sent on registration when MailerSend is active.",
    assignmentsTitle: "Assignments",
    assignmentsDescription: "Declarations linked to client emails.",
    assignmentsEmpty: "No assignments yet.",
    assignmentsEmptyTitle: "No assignments yet",
    assignmentsEmptyDescription:
      "Register a client and select a declaration to create an assignment.",
    empty: "No client registrations yet.",
    emptyTitle: "No client registrations yet",
    emptyDescription:
      "Register a client to create their account and first assignment.",
    emptyAction: "Register client",
    openInvite: "Resend invite",
    tableName: "Name",
    tableEmail: "Email",
    tableStatus: "Status",
    tableActions: "Actions",
    tableDeclaration: "Declaration",
    tableClient: "Client",
    tableDue: "Due date",
    searchPlaceholder: "Search clients…",
    searchAssignmentsPlaceholder: "Search assignments…",
    filterAll: "All statuses",
    filterStatusLabel: "Status",
    removeRegistration: "Remove",
    removeRegistrationTitle: "Remove client registration?",
    removeRegistrationConfirm:
      "Deletes this registration, assignments for this email, the client profile, and the Supabase login. This cannot be undone.",
    removeRegistrationSubmit: "Remove client",
    removeRegistrationCancel: "Cancel",
    removeSuccess: "Client registration removed.",
    removeError: "Could not remove this registration.",
    removeMissing: "Registration not found.",
    removeAssignment: "Remove",
    removeAssignmentTitle: "Remove assignment?",
    removeAssignmentConfirm:
      "Removes this declaration assignment. The client account stays active.",
    removeAssignmentSubmit: "Remove assignment",
    removeAssignmentCancel: "Cancel",
    assignmentRemoveError: "Could not remove this assignment.",
    assignmentRemoveMissing: "Assignment not found.",
    managementNote:
      "Full admin user management (roles, bulk actions) will be added after deploy.",
    status: {
      pending: "Pending",
      accepted: "Active",
      expired: "Expired",
    },
  },

  clientInvite: {
    eyebrow: "Registration",
    title: "Check your email",
    description: "Use the access message from your organization to sign in.",
    issueTitle: "Register client",
    issueDescription:
      "Create a Supabase account with the shared temporary password and assign at least one declaration.",
    issueDescriptionWithEmail:
      "Creates the client account, assigns the declaration, and emails portal access from your MailerSend sender.",
    issueDescriptionWithoutEmail:
      "Creates the client account and assignment. Copy the access message manually until MailerSend is configured.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Alex Morgan",
    issueSubmit: "Register client",
    issueSubmitWithEmail: "Register & send access email",
    issueSubmitting: "Registering client…",
    issueError: "Enter a valid email, full name, and declaration.",
    unexpectedError:
      "Registration could not be completed. Check your connection and try again.",
    assignLabel: "Assign declaration",
    assignPlaceholder: "Select a declaration",
    assignRequired: "Select a declaration to assign.",
    noDeclarations: "Create a declaration before registering clients.",
    dueDateLabel: "Due date (optional)",
    issued: "Client registered. Copy the access message below.",
    issuedAndEmailed: "Client registered and access email sent.",
    issuedEmailFailed:
      "Client registered, but the email could not be sent. Copy the access message below.",
    emailNotConfigured:
      "Access email is not configured. Copy the access message below after registration.",
    backupAccessLabel: "Backup access message (if email did not arrive)",
    provisionFailed: "Could not create the client account. Check Supabase configuration.",
  },

  emailDelivery: {
    enabledTitle: "Access email is active",
    enabledDescription: ({
      fromName,
      fromEmail,
    }: {
      fromName: string;
      fromEmail: string;
    }) =>
      `New registrations email portal access automatically from ${fromName} <${fromEmail}>. You can still copy the message below as a backup.`,
    disabledTitle: "Access email is not configured",
    disabledDescription:
      "Set MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL in Vercel to send access emails automatically. Until then, copy the access message after each registration.",
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
    formStepLabel: (current: number, total: number) =>
      `Step ${current} of ${total}`,
    formNextStep: "Continue",
    formPreviousStep: "Back",
    requiredError:
      "Complete all required identity, passport, entity, and contact fields and confirm the accuracy statement.",
  },

  clientProfile: {
    eyebrow: CLIENT_PORTAL_EYEBROW,
    title: "Declarant profile",
    description:
      "Review the identity and entity details linked to your declaration submissions. These were confirmed when you completed onboarding.",
    correctionNotice:
      "Contact your organization directly to request profile changes. Amendments are managed outside this portal.",
  },

  clientDashboard: {
    eyebrow: CLIENT_PORTAL_EYEBROW,
    title: "Declaration workspace",
    description:
      "Review declarations assigned to you by your organization, complete attestations, and retain confirmation codes for your records. Submissions are linked to your declarant profile and retained for organizational review.",
    pending: "Pending",
    submitted: "Submitted",
    complete: "Complete declaration",
    viewReceipt: "View receipt",
    pendingStatusHelp:
      "This declaration requires your attestation. Review each section carefully before submitting.",
    submittedStatusHelp:
      "This declaration has been submitted. Retain your confirmation code for audit and record-keeping.",
    dueSoonLabel: "Due soon",
    overdueLabel: "Overdue",
    assignmentsSectionTitle: "Assigned declarations",
    assignmentsSectionDescription:
      "Complete each pending declaration in full. You cannot amend a submission after it is recorded.",
    emptyTitle: "No declarations assigned",
    empty:
      "Your organization has not assigned any declarations to you yet. When a declaration is ready, it will appear here with a due date if applicable. Contact your organization if you expected an assignment.",
    assignmentNotFound: "Assignment not found.",
    alreadySubmitted: "This declaration has already been submitted.",
    deadlineExpiredAssignment:
      "This assignment is past its due date and can no longer be submitted.",
    deadlineExpiredDeclaration:
      "This declaration is past its submission deadline and can no longer be submitted.",
    receiptTitle: "Submission receipt",
    receiptDescription: "Keep this confirmation code for your records.",
    dueLabel: (date: string) => `Due ${date}`,
    signOut: "Sign out",
    backToAssignments: "Back to assignments",
    metrics: {
      pending: "Pending",
      pendingDescription: "Declarations awaiting your attestation",
      submitted: "Submitted",
      submittedDescription: "Declarations recorded with confirmation codes",
      dueSoon: "Due soon",
      dueSoonDescription: "Pending declarations with an approaching due date",
    },
    declarantSummaryTitle: "Declarant profile",
    declarantSummaryDescription:
      "Identity and entity details established during onboarding. Contact your organization to request corrections.",
    declarantFullNameLabel: "Full legal name",
    declarantEntityLabel: "Legal entity",
    declarantJurisdictionLabel: "Governing jurisdiction",
    legalNoticeTitle: "Legal notice",
    legalNotice: [
      "You must submit only information you are authorized to declare on behalf of the legal entity on your profile, or as an individual declarant where applicable.",
      "False or misleading declarations may affect organizational review, regulatory obligations, and the validity of attestations linked to your account.",
      "Identity and entity details were confirmed when you completed your declarant profile. Declaration answers are collected separately for each assignment.",
    ] as const,
    statutoryTitle: "Your obligations as a declarant",
    statutoryItems: [
      {
        question: "What am I attesting to?",
        answer:
          "Each declaration asks you to confirm specific statements or provide authorized information. Your responses form part of an organizational record and may be subject to review under applicable law.",
      },
      {
        question: "What happens when I submit?",
        answer:
          "Your submission is recorded with a confirmation code and linked to your declarant profile. Your organization retains submission records for audit and review.",
      },
      {
        question: "How is file evidence handled?",
        answer:
          "File questions record filename and type metadata only. Original files are not uploaded to the portal.",
      },
      {
        question: "What is recorded in the audit trail?",
        answer:
          "Sign-in, invitation, profile completion, portal acknowledgement, and declaration events may be recorded for organizational review. Passport numbers and declaration answers are not written to audit logs.",
      },
      {
        question: "How do I correct my profile or a submission?",
        answer:
          "Contact your organization directly. Profile changes and submission amendments are managed outside this portal.",
      },
    ] as const,
    acknowledgement: {
      title: "Acknowledge portal responsibilities",
      description:
        "Before completing assigned declarations, confirm you understand your obligations as a declarant on this portal.",
      summary:
        "You will submit only authorized information, retain confirmation codes for your records, and follow your organization's declaration requirements.",
      switchLabel:
        "I have read and understand my responsibilities as a declarant on this portal.",
      submit: "Confirm acknowledgement",
      submitting: "Confirming…",
      requiredError: "Confirm your responsibilities before continuing.",
      acknowledgedOn: (date: string) => `Responsibilities acknowledged on ${date}.`,
      gateNotice:
        "Confirm your portal responsibilities below before starting a declaration.",
    },
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
      title: "Declaration workspace",
      description: "Assigned declarations and declarant attestations.",
    },
    dashboard: {
      title: "Declaration management",
      description: "Manage declarations, clients, and submissions.",
    },
    accountSettings: {
      title: "Account settings",
      description:
        "Manage your organization operator profile and account details.",
    },
    accountSecurity: {
      title: "Security",
      description: "Change your password and manage active sessions.",
    },
    clientInvitations: {
      title: "Client registrations",
      description:
        "Register clients with a temporary password and required declaration assignment.",
    },
    clientProfile: {
      title: "Declarant profile",
      description:
        "Review the identity and entity details linked to your declaration submissions.",
    },
    clientOnboarding: {
      title: "Establish your declarant identity",
      description:
        "Confirm the legal entity and jurisdiction under which you attest before completing declarations.",
    },
    clientDeclare: {
      title: "Complete declaration",
      description:
        "Secure submission for your assigned declaration. Add business context in your note only if appropriate.",
    },
    authSignUp: {
      title: "Create account",
      description:
        "Set up your portal access. We will send a verification code to confirm your email.",
    },
    authForgotPassword: {
      title: "Reset password",
      description:
        "Enter your email and we will send a secure reset link. The link expires in 15 minutes.",
    },
    authResetPassword: {
      title: "Choose a new password",
      description: "Enter a new password for your account, then sign in.",
    },
    authSignOut: {
      title: "Signing out",
      description: "Please wait while we end your session.",
    },
    authEmailOtp: {
      title: "Sign in with verification code",
      description:
        "Receive a one-time verification code by email to access your declarations.",
    },
    authMagicLink: {
      title: "Sign in with email link",
      description:
        "Receive a secure, time-limited sign-in link by email to access your declarations.",
    },
    previewUnavailable: {
      title: "Preview not available",
      description:
        "Configure preview client credentials and seed data before using operator preview.",
    },
    inviteRedirect: {
      title: "Invitation link",
      description: "Legacy invitation link forwarding to client sign in.",
    },
    clientInvitationJoin: {
      title: "Accept your invitation",
      description:
        "Create your portal account with your invited email, then join your organization.",
    },
    openLink: {
      title: "Open declaration link",
      description:
        "Public declaration link. Sign in to complete your assigned declaration.",
    },
    secureLink: {
      title: "Secure declaration link",
      description:
        "Secure declaration link. Sign in to complete your assigned declaration.",
    },
  },
} as const;
