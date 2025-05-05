
import { motion } from 'framer-motion';

const teamMembers = [
  {
    name: "Harshit Mishra",
    role: "", // Add empty role property
    image: "https://media.licdn.com/dms/image/v2/D5603AQHAAg2mYKjxXw/profile-displayphoto-shrink_400_400/B56ZaQtoB2GUAk-/0/1746184605448?e=1751500800&v=beta&t=1hFqwl3bwF0CgtjzWg6alx7cs_qXUrvYKmrtCO1f2xQ",
    description: "NIT ALLAHABAD-CSED'24"
  },
  {
    name: "Ujjwal Tyagi",
    role: "", // Add empty role property
    image: "https://media.licdn.com/dms/image/v2/D5603AQHySsOdEviteQ/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1725455673163?e=1751500800&v=beta&t=-Q_25BGCCiMJFVSNvOD_KCugzNSKSc4OyRHhRqcfAD0",
    description: "NIT ALLAHABAD CSE'24"
  }
  
];

const OurTeam = () => {
  return (
    <section
      id="team"
      className="py-24 md:py-32 bg-gradient-to-b from-[#1e293b] to-[#334155] text-white relative overflow-hidden"
    >
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Our Team
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-gray-300">
            Meet the passionate people behind our success.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              className="bg-white/10 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg hover:scale-105 transition-transform"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <img
                src={member.image}
                alt={member.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-400 mb-4 shadow-md"
              />
              <h3 className="text-xl font-semibold text-white">{member.name}</h3>
              <div className="text-sm text-blue-300 font-medium mb-2">{member.role}</div>
              <p className="text-gray-300 text-sm">{member.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurTeam; 
