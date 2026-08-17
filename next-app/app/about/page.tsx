"use client";

// Import page stylesheet
import "./about.css";

// About page component
export default function AboutPage() {
  return (
    <>
      <main className="main">

      {/* Page heading */}
      <section className="about-header">

        <h1>About Hydrogen Lab Safety</h1>

        <p>
          Learn more about the purpose, features and technology behind the
          Hydrogen Lab Safety training platform.
        </p>

      </section>

      {/* About the application */}
      <section className="about-section">

        <div className="section-title">
          <h2>What is Hydrogen Lab Safety?</h2>
        </div>

        <div className="about-card">

          <p>
            Hydrogen Lab Safety is an educational web application developed to
            provide interactive hydrogen laboratory safety training in a safe,
            virtual environment.
          </p>

          <p>
            The platform combines learning modules, quizzes, progress tracking
            and administrative tools to help learners understand hydrogen
            hazards before entering a real laboratory.
          </p>

          <p>
            Developed as part of the ITECH3208 Software Engineering Project at
            Federation University Australia, the application demonstrates modern
            web development practices including secure authentication,
            role-based access control and cloud database integration.
          </p>

        </div>

      </section>
            {/* Why Hydrogen Safety section */}
      <section className="about-section">

        {/* Section heading */}
        <div className="section-title">
          <h2>Why Hydrogen Safety?</h2>

          <p className="section-subtitle">
            Hydrogen is a clean and efficient energy source, but it also presents
            unique hazards that require specialised safety knowledge and training.
          </p>
        </div>

        {/* Information cards */}
        <div className="info-grid">

          {/* Card 1 */}
          <div className="info-card">

            <div className="info-icon">👁</div>

            <h3>Invisible Flame</h3>

            <p>
              Hydrogen flames can be almost invisible in daylight,
              making them difficult to detect without specialised
              equipment.
            </p>

          </div>

          {/* Card 2 */}
          <div className="info-card">

            <div className="info-icon">🔥</div>

            <h3>Highly Flammable</h3>

            <p>
              Hydrogen ignites easily and burns rapidly.
              Understanding safe handling procedures helps
              minimise the risk of accidents.
            </p>

          </div>

          {/* Card 3 */}
          <div className="info-card">

            <div className="info-icon">🎓</div>

            <h3>Safe Learning</h3>

            <p>
              This application allows learners to understand
              hydrogen hazards through interactive learning
              before entering a real laboratory.
            </p>

          </div>

        </div>

      </section>
            {/* Platform features */}
      <section className="about-section">

        {/* Section heading */}
        <div className="section-title">

          <h2>Platform Features</h2>

          <p className="section-subtitle">
            Hydrogen Lab Safety combines modern web technologies with
            interactive learning tools to create an engaging and secure
            training experience.
          </p>

        </div>

        {/* Features grid */}
        <div className="feature-grid">

          {/* Secure Authentication */}
          <div className="feature-card">

            <div className="feature-icon">🔐</div>

            <h3>Secure Authentication</h3>

            <p>
              Firebase Authentication provides secure user registration,
              login and password recovery while protecting learner accounts.
            </p>

          </div>

          {/* Learning Modules */}
          <div className="feature-card">

            <div className="feature-icon">📚</div>

            <h3>Interactive Modules</h3>

            <p>
              Five structured learning modules introduce users to common
              hydrogen hazards and laboratory safety procedures.
            </p>

          </div>

          {/* Virtual Laboratory */}
          <div className="feature-card">

            <div className="feature-icon">🧪</div>

            <h3>Virtual Laboratory</h3>

            <p>
              Explore a simulated hydrogen laboratory environment and
              identify potential hazards before entering a real lab.
            </p>

          </div>

          {/* Quizzes */}
          <div className="feature-card">

            <div className="feature-icon">📝</div>

            <h3>Knowledge Quizzes</h3>

            <p>
              Reinforce learning through quizzes designed to assess
              understanding of each training module.
            </p>

          </div>

          {/* Progress Tracking */}
          <div className="feature-card">

            <div className="feature-icon">📊</div>

            <h3>Progress Tracking</h3>

            <p>
              Learners can monitor completed modules and continue their
              training from where they previously stopped.
            </p>

          </div>

          {/* Administration */}
          <div className="feature-card">

            <div className="feature-icon">👨‍💼</div>

            <h3>Administration Portal</h3>

            <p>
              Administrators can manage users, roles and learner progress
              through a secure administration dashboard.
            </p>

          </div>

        </div>

      </section>
            {/* Technology stack */}
      <section className="about-section">

        {/* Section heading */}
        <div className="section-title">

          <h2>Technology Stack</h2>

          <p className="section-subtitle">
            Hydrogen Lab Safety was built using modern web technologies to
            provide a secure, responsive and scalable learning platform.
          </p>

        </div>

        {/* Technology cards */}
        <div className="tech-grid">

          <div className="tech-card">
            <div className="tech-icon">⚛️</div>
            <h3>React</h3>
            <p>Component-based user interface development.</p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">▲</div>
            <h3>Next.js</h3>
            <p>Routing, server rendering and application framework.</p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🔥</div>
            <h3>Firebase</h3>
            <p>Authentication and secure user management.</p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">🗄️</div>
            <h3>Supabase</h3>
            <p>Cloud database and learner progress storage.</p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">💻</div>
            <h3>GitHub</h3>
            <p>Version control and collaborative development.</p>
          </div>

        </div>

      </section>
            {/* About the project */}
      <section className="about-section">

        {/* Section heading */}
        <div className="section-title">

          <h2>About the Project</h2>

        </div>

        {/* Project summary */}
        <div className="about-card">

          <p>
            Hydrogen Lab Safety was developed by the Hydrogen Training Team
            as part of the ITECH3208 Software Project at
            Federation University Australia.
          </p>

          <p>
            The project demonstrates modern software engineering principles,
            including secure authentication, role-based access control,
            cloud database integration, responsive web design and interactive
            learning experiences.
          </p>

        </div>

      </section>
            {/* Acknowledgements */}
      <section className="about-section">

        {/* Section heading */}
        <div className="section-title">

          <h2>Acknowledgements</h2>

        </div>

        {/* Acknowledgements card */}
        <div className="about-card">

          <p>
            This project was developed for the School of Science,
            Engineering at Federation University and the general public in
            Australia as part of the ITECH3208 Project.
          </p>
          <p>
            We gratefully acknowledge the guidance provided by our teaching
            staff and the collaborative efforts of every member of the
            Hydrogen Training Team throughout the project.
          </p>

        </div>

      </section>

    </main>
    {/* About page footer */}
    <footer className="about-footer">

      {/* Copyright */}
      <p>© 2026 Hydrogen Training Team</p>

    </footer>
    </>
  );
}
