const USPSection = () => {
  const features = [
    {
      icon: '🔮',
      title: 'Predictive Offline Operation',
      description: 'AI models work autonomously offline, queueing queries and syncing when connectivity is restored through manifest-driven updates.',
    },
    {
      icon: '📦',
      title: 'Knowledge Capsules & Signing',
      description: 'Signed Q&A units (Knowledge Capsules) ensure data integrity and authenticity across the distributed mesh network.',
    },
    {
      icon: '⚡',
      title: 'AI-Driven Query Processing',
      description: 'Generative models process queries and generate responses in minutes, even when operating in offline mode with cached knowledge.',
    },
    {
      icon: '🔧',
      title: 'Smart Queue Optimization',
      description: 'Intelligent queueing and retransmission with exponential backoff ensures reliable packet delivery across unreliable network conditions.',
    },
    {
      icon: '💻',
      title: 'In-Mesh Simulation & Testing',
      description: 'Digital-twin models simulate packet flows, network conditions, and offline scenarios without requiring live infrastructure.',
    },
    {
      icon: '📈',
      title: 'Symptom & Response Prediction',
      description: 'Maps queries to cached responses and suggests escalation paths when authoritative processing is needed.',
    },
    {
      icon: '🌐',
      title: '3D Mesh Visualization Engine',
      description: 'Interactive interface for visualizing Main Hub ↔ Mini Hub connections, packet flows, and network topology.',
    },
    {
      icon: '📡',
      title: 'Real-Time Manifest Sync',
      description: 'Manifest-driven selective sync ensures Mini Hubs stay updated with latest Knowledge Capsules while minimizing bandwidth usage.',
    },
  ];

  return (
    <section className="py-12 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
            Key Features & USPs
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-3"></div>
          <p className="text-base text-gray-700 dark:text-gray-300 italic max-w-2xl mx-auto">
            Comprehensive capabilities for resilient, offline-first AI operations
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary/30 transform hover:-translate-y-1"
              role="article"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-base font-bold mb-2 text-gray-900 dark:text-white leading-tight">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default USPSection;
