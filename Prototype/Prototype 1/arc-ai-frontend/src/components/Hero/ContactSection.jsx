const ContactSection = () => {
  return (
    <section className="py-12 px-4 bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-white" id="contact">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">
            Contact Us
          </h2>
          <div className="w-16 h-1 bg-primary mx-auto mb-3"></div>
        </div>
        
        {/* Contact Card */}
        <div className="bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-700/50 dark:border-gray-600/50 hover:border-primary/50 transition-all max-w-md mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-primary">VL</span>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">
              Vedant Lanjekar
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a 
                  href="mailto:vedantlanjekar456@gmail.com" 
                  className="text-gray-300 dark:text-gray-400 hover:text-primary transition-colors break-all"
                >
                  vedantlanjekar456@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a 
                  href="tel:+91907627036" 
                  className="text-gray-300 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  +91 907627036
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
