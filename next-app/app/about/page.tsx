"use client";

import "./about.css";

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

        {/* Why Hydrogen Safety */}
        <section className="about-section">

          <div className="section-title">
            <h2>Why Hydrogen Safety?</h2>

            <p className="section-subtitle">
              Hydrogen is a clean and efficient energy source, but it also presents
              unique hazards that require specialised safety knowledge and training.
            </p>
          </div>

          <div className="info-grid">

            <div className="info-card">
              <div className="info-icon">👁</div>
              <h3>Invisible Flame</h3>

              <p>
                Hydrogen flames can be almost invisible in daylight,
                making them difficult to detect without specialised equipment.
              </p>
            </div>

            <div className="info-card">
              <div className="info-icon">🔥</div>
              <h3>Highly Flammable</h3>

              <p>
                Hydrogen ignites easily and burns rapidly.
                Understanding safe handling procedures helps minimise the risk
                of accidents.
              </p>
            </div>

            <div className="info-card">
              <div className="info-icon">🎓</div>
              <h3>Safe Learning</h3>

              <p>
                This application allows learners to understand hydrogen hazards
                through interactive learning before entering a real laboratory.
              </p>
            </div>

          </div>

        </section>

        {/* Platform features */}
        <section className="about-section">

          <div className="section-title">
            <h2>Platform Features</h2>

            <p className="section-subtitle">
              Hydrogen Lab Safety combines modern web technologies with
              interactive learning tools to create an engaging and secure
              training experience.
            </p>
          </div>

          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Secure Authentication</h3>

              <p>
                Firebase Authentication provides secure user registration,
                login and password recovery while protecting learner accounts.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Interactive Modules</h3>

              <p>
                Five structured learning modules introduce users to common
                hydrogen hazards and laboratory safety procedures.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🧪</div>
              <h3>Virtual Laboratory</h3>

              <p>
                Explore a simulated hydrogen laboratory environment and
                identify potential hazards before entering a real lab.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Knowledge Quizzes</h3>

              <p>
                Reinforce learning through quizzes designed to assess
                understanding of each training module.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>

              <p>
                Learners can monitor completed modules and continue their
                training from where they previously stopped.
              </p>
            </div>

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

          <div className="section-title">
            <h2>Technology Stack</h2>

            <p className="section-subtitle">
              Hydrogen Lab Safety was built using modern web technologies to
              provide a secure, responsive and scalable learning platform.
            </p>
          </div>

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

          <div className="section-title">
            <h2>About the Project</h2>
          </div>

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

        {/* Contributors */}
        <section className="about-section">

          <div className="section-title">
            <h2>Contributors</h2>

            <p className="section-subtitle">
              The people who contributed to the development, content and delivery
              of the Hydrogen Lab Safety training platform.
            </p>
          </div>

          <div className="contributor-group">

            <div className="contributor-group-heading">
              <div className="contributor-group-icon">👥</div>

              <div>
                <h3>Project Leadership &amp; Content</h3>

                <p>
                  Providing project direction, academic supervision and hydrogen
                  safety content.
                </p>
              </div>
            </div>

            <div className="leadership-grid">

              <div className="leadership-card">
                <div className="contributor-avatar">👤</div>

                <div className="leadership-card-content">
                  <h3>Ass Prof Surbhi Sharma</h3>

                  <div className="contributor-role">
                    Product Owner &amp; Content Contributor
                  </div>

                  <p>
                    Provided project direction and hydrogen safety content used
                    in the training modules.
                  </p>
                </div>
              </div>

              <div className="leadership-card">
                <div className="contributor-avatar">👤</div>

                <div className="leadership-card-content">
                  <h3>Prof Bhavna Antony</h3>

                  <div className="contributor-role">
                    Project Supervisor &amp; Unit Coordinator
                  </div>

                  <p>
                    Provided academic supervision, project guidance and support
                    throughout the project.
                  </p>
                </div>
              </div>

            </div>

          </div>

          <div className="contributor-group">

            <div className="contributor-group-heading">
              <div className="contributor-group-icon">👥</div>

              <div>
                <h3>Development Team</h3>

                <p>
                  Designing, developing, integrating and delivering the
                  Hydrogen Lab Safety training platform.
                </p>
              </div>
            </div>

            <div className="development-grid">

              <div className="developer-card">
                <div className="contributor-avatar">👤</div>
                <h3>Caleb Mclean</h3>
                <div className="contributor-role">Team Member</div>
                <p>Hydrogen Training Team</p>
              </div>

              <div className="developer-card">
                <div className="contributor-avatar">👤</div>
                <h3>Sarin Bhandari</h3>
                <div className="contributor-role">Team Member</div>
                <p>Hydrogen Training Team</p>
              </div>

              <div className="developer-card">
                <div className="contributor-avatar">👤</div>
                <h3>Danuja Khadka</h3>
                <div className="contributor-role">Team Member</div>
                <p>Hydrogen Training Team</p>
              </div>

              <div className="developer-card">
                <div className="contributor-avatar">👤</div>
                <h3>Adeola Ayeni</h3>
                <div className="contributor-role">Team Member</div>
                <p>Hydrogen Training Team</p>
              </div>

            </div>

          </div>



        </section>

        {/* Acknowledgements */}
        <section className="about-section">

          <div className="section-title">
            <h2>Acknowledgements</h2>
          </div>

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

      <footer className="about-footer">
        © 2026 Hydrogen Training Team
      </footer>

    </>
  );
}


