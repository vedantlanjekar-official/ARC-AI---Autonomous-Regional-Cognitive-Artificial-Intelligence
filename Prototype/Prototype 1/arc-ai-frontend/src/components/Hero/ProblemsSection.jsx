const ProblemsSection = () => {
  const problems = [
    {
      icon: '📡',
      title: 'Internet Dependency',
      description: 'Traditional AI systems fail when connectivity is lost. ARC-AI keeps working offline, ensuring continuous access to intelligence without internet dependency.',
    },
    {
      icon: '⚡',
      title: 'Slow Response Times',
      description: 'Cloud-based AI requires constant internet connectivity. ARC-AI provides instant local responses through distributed Mini Hubs, reducing latency significantly.',
    },
    {
      icon: '🛡️',
      title: 'Data Privacy & Security',
      description: 'Sensitive data stays local with ARC-AI. Our encrypted mesh network processes information on your infrastructure, reducing cloud costs and privacy risks.',
    },
    {
      icon: '🌐',
      title: 'Fragmented Data Sources',
      description: 'Biological and operational data is scattered across systems. ARC-AI integrates all datasets into a unified offline mesh pipeline.',
    },
    {
      icon: '📊',
      title: 'Poor Offline Forecasting',
      description: 'Current systems require constant connectivity. ARC-AI predicts outcomes and manages queues using manifest-driven sync, working autonomously offline.',
    },
    {
      icon: '💰',
      title: 'High Infrastructure Costs',
      description: 'Advanced AI needs expensive cloud infrastructure. ARC-AI provides scalable offline access through distributed Mini Hubs, reducing operational costs.',
    },
  ];

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
            Problems We Solve
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-3"></div>
          <p className="text-base text-gray-700 dark:text-gray-300 italic max-w-2xl mx-auto">
            Addressing critical challenges in modern AI infrastructure
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary/20 transform hover:-translate-y-1"
              role="article"
            >
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white leading-tight">
                {problem.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemsSection;
