const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      icon: '📤',
      title: 'Data Input & Upload',
      description: 'Users upload queries, packets, or datasets through secure Mini Hub endpoints. Data is encrypted and queued for processing.',
    },
    {
      number: 2,
      icon: '🧠',
      title: 'AI Processing & Knowledge Capsules',
      description: 'The Main Hub analyzes queries, generates Knowledge Capsules (signed Q&A units), and creates manifests for distribution across the mesh.',
    },
    {
      number: 3,
      icon: '🔐',
      title: 'Encrypted Mesh Distribution',
      description: 'Knowledge Capsules are encrypted, signed, and distributed through the two-tier mesh network (Main Hub ↔ Mini Hubs) with manifest-driven sync.',
    },
    {
      number: 4,
      icon: '⚡',
      title: 'Local Inference & Fallback',
      description: 'Mini Hubs serve cached responses instantly. When offline, local inference provides fallback answers while queuing for authoritative processing.',
    },
    {
      number: 5,
      icon: '📊',
      title: 'Interactive Dashboard & Monitoring',
      description: 'Results appear through packet transaction views, chatbot interfaces, and capsule management tools with real-time telemetry and timeline tracking.',
    },
  ];

  return (
    <section id="how-it-works" className="py-12 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
            How Our System Works
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-3"></div>
          <p className="text-base text-gray-700 dark:text-gray-300 italic max-w-3xl mx-auto">
            A streamlined 5-step workflow from query input to actionable intelligence
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary/20 transform hover:-translate-y-1"
              role="article"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center text-base font-bold shadow-md">
                  {step.number}
                </div>
                <div className="text-2xl">{step.icon}</div>
              </div>
              <h3 className="text-base font-bold mb-2 text-gray-900 dark:text-white leading-tight text-center">
                {step.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-xs text-center">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 bg-gradient-to-br from-blue-50 to-primary/5 dark:from-blue-900/20 dark:to-primary/10 border-2 border-primary/30 dark:border-primary/50 rounded-xl p-8 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                End-to-End Workflow
              </h3>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
                From raw queries to actionable intelligence, ARC-AI's automated pipeline processes your inputs through advanced AI models, 
                generates Knowledge Capsules, simulates offline scenarios, and delivers comprehensive visualizations—all in a unified, 
                offline-first mesh platform designed for resilience and privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
