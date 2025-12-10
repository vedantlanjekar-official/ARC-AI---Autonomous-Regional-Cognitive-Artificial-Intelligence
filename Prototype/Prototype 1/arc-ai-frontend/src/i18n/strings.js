// Internationalization strings - English (en)
export const strings = {
  en: {
    // Hero Section
    hero: {
      title: "ARC-AI — Offline AI Mesh for Resilient Intelligence",
      subtitle: "Self-learning, encrypted AI that works without the Internet.",
      ctaPrimary: "Get Started",
      ctaSecondary: "View Demo",
      trustLine: "Works offline, low-power, deployable in rural & critical sites",
    },
    // Problems Section
    problems: {
      title: "Problems We Solve",
      internetDependency: {
        title: "Internet Dependency",
        description: "Traditional AI systems fail when connectivity is lost. ARC-AI keeps working offline, ensuring continuous access to intelligence.",
      },
      remoteAccess: {
        title: "AI Access Gap",
        description: "Remote regions lack reliable internet for AI services. Our mesh network brings intelligence to the edge.",
      },
      privacyCost: {
        title: "Data Privacy & Cost",
        description: "Reduce cloud costs and keep sensitive data local. ARC-AI processes information on your infrastructure.",
      },
    },
    // USP Section
    usp: {
      title: "Key Features",
      offline: "Offline operation",
      capsules: "Knowledge Capsules (signed Q&A units)",
      mesh: "Two-tier mesh (Main Hub + Mini Hubs)",
      encryption: "End-to-end encryption",
      fallback: "Local inference fallback",
    },
    // How We Work
    howItWorks: {
      title: "How We Work",
      step1: {
        title: "User → Mini Hub",
        description: "Local access, fast response",
      },
      step2: {
        title: "Mini Hub → Main Hub",
        description: "Manifest, capsules, sync",
      },
      step3: {
        title: "Autonomous Learning",
        description: "Offline fallback with queueing and manifest-driven sync",
      },
    },
    // Auth
    auth: {
      signIn: "Sign In",
      signUp: "Sign Up",
      email: "Email / Username",
      password: "Password",
      confirmPassword: "Confirm Password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      fullName: "Full Name",
      organization: "Organization",
      role: "Role",
      acceptTerms: "I accept the terms and conditions",
      privacyNote: "Data stays on local mesh by default",
      roles: {
        admin: "Admin",
        operator: "Operator",
        user: "User",
      },
    },
    // Dashboard
    dashboard: {
      title: "Dashboard",
      overview: "Overview",
      packets: "Packet Transactions",
      chatbot: "Chatbot",
      capsules: "Capsules",
      logs: "Logs",
      admin: "Admin",
      nodeStatus: {
        online: "Online",
        degraded: "Degraded",
        offline: "Offline",
      },
    },
    // Packet Transactions
    packets: {
      title: "Packet Transactions",
      timestamp: "Timestamp",
      packetId: "Packet ID",
      source: "Source",
      destination: "Destination",
      type: "Type",
      size: "Size",
      status: "Status",
      actions: "Actions",
      viewDetails: "View Details",
      retry: "Retry",
      forceSync: "Force Sync",
      exportLogs: "Export Logs",
      requestManifest: "Request Capsule Manifest",
      statuses: {
        sent: "SENT",
        acked: "ACKED",
        queued: "QUEUED",
        failed: "FAILED",
      },
      types: {
        query: "QUERY",
        response: "RESPONSE",
        capsule: "CAPSULE",
      },
    },
    // Chatbot
    chatbot: {
      title: "Chatbot",
      placeholder: "Ask a question...",
      send: "Send",
      mic: "Microphone",
      provenance: {
        localCache: "LocalCache",
        miniHub: "MiniHub",
        mainHub: "MainHub",
      },
      provisional: "Provisional — queued for authoritative capsule",
      escalate: "Escalate",
      confidence: "Confidence",
    },
    // Capsules
    capsules: {
      title: "Capsule Manager",
      search: "Search by question hash or capsule ID",
      revoke: "Revoke",
      promote: "Promote",
      signatureVerified: "Signature Verified",
      ttl: "TTL",
      days: "days",
    },
    // Contact
    contact: {
      title: "Contact Us",
      supportEmail: "Support Email",
      regionalOffice: "Regional Office",
      name: "Name",
      organization: "Organization",
      message: "Message",
      send: "Send Message",
    },
    // Footer
    footer: {
      docs: "Docs",
      whitepaper: "Whitepaper",
      deployments: "Deployments",
      careers: "Careers",
      github: "GitHub",
    },
  },
};

// Get string by key path (e.g., "hero.title")
export const t = (key, lang = "en") => {
  const keys = key.split(".");
  let value = strings[lang];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};


