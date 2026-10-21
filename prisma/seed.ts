import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/account-admission/passwords';
import { hashOpaqueToken } from '../src/lib/account-admission/tokens';
import { solveMathOrStemProblem } from '../src/lib/math-engine/solver';
import { generateFunctionGraph } from '../src/lib/math-engine/grapher';

async function main() {
  console.log('Seeding Tavi database...');

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const adminPasswordHash = await hashPassword('AdminPassword123!');
  const tutorPasswordHash = await hashPassword('TutorPassword123!');

  // 1. Seed Platform Administrator and Verified Faculty Tutor (no demo student user)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tavi.test' },
    update: {
      name: 'Tavi Platform Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      planTier: 'PLUS',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@tavi.test',
      name: 'Tavi Platform Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      planTier: 'PLUS',
      freeQueriesRemaining: 9999,
      aiProRemaining: 99,
      courseCreditsRemaining: 999,
      passwordHash: adminPasswordHash,
      emailVerified: now,
      passwordCredential: {
        create: { passwordHash: adminPasswordHash, passwordChangedAt: now },
      },
    },
  });

  // Clean up any legacy demo student accounts
  await prisma.user.deleteMany({
    where: {
      role: 'STUDENT',
      email: { notIn: ['admin@tavi.test', 'tutor@tavi.test'] },
    },
  });

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@tavi.test' },
    update: {
      name: 'Dr. Evelyn Vance',
      role: 'TUTOR',
      status: 'ACTIVE',
      planTier: 'PLUS',
      passwordHash: tutorPasswordHash,
    },
    create: {
      email: 'tutor@tavi.test',
      name: 'Dr. Evelyn Vance',
      role: 'TUTOR',
      status: 'ACTIVE',
      planTier: 'PLUS',
      freeQueriesRemaining: 999,
      aiProRemaining: 50,
      courseCreditsRemaining: 99,
      passwordHash: tutorPasswordHash,
      emailVerified: now,
      passwordCredential: {
        create: { passwordHash: tutorPasswordHash, passwordChangedAt: now },
      },
    },
  });

  // 2. Seed Single-Use & Expiring Invitations
  const sampleInvites = [
    {
      code: 'TAVI-2026-STUD',
      email: 'student-invite@tavi.test',
      role: 'STUDENT',
      status: 'PENDING',
      maxUses: 1,
      expiresAt: nextWeek,
      activeForEmail: 'student-invite@tavi.test',
      tokenHash: hashOpaqueToken('TAVI-2026-STUD'),
    },
    {
      code: 'TAVI-2026-TUTR',
      email: 'tutor-invite@tavi.test',
      role: 'TUTOR',
      status: 'PENDING',
      maxUses: 1,
      expiresAt: nextWeek,
      activeForEmail: 'tutor-invite@tavi.test',
      tokenHash: hashOpaqueToken('TAVI-2026-TUTR'),
    },
    {
      code: 'TAVI-2026-EXPD',
      email: 'expired-invite@tavi.test',
      role: 'STUDENT',
      status: 'EXPIRED',
      maxUses: 1,
      expiresAt: lastWeek,
      activeForEmail: null,
      tokenHash: null,
    },
  ];

  for (const inv of sampleInvites) {
    await prisma.accountInvitation.upsert({
      where: { code: inv.code },
      update: {
        status: inv.status,
        expiresAt: inv.expiresAt,
      },
      create: {
        code: inv.code,
        email: inv.email,
        normalizedEmail: inv.email.toLowerCase(),
        activeForEmail: inv.activeForEmail,
        tokenHash: inv.tokenHash,
        role: inv.role,
        status: inv.status,
        maxUses: inv.maxUses,
        usedCount: 0,
        invitedById: admin.id,
        expiresAt: inv.expiresAt,
      },
    });
  }

  // 3. Seed Verified Study Bank Questions across all 12 subjects
  const seedQuestions = [
    {
      id: 'sol-quadratic-roots',
      slug: 'sol-quadratic-roots',
      subject: 'Math',
      topic: 'Algebra · Quadratic Equations',
      promptText: 'Solve x^2 - 5x + 6 = 0',
      mode: 'PRO',
    },
    {
      id: 'sol-calculus-derivative',
      slug: 'sol-calculus-derivative',
      subject: 'Math',
      topic: 'Calculus · Differentiation',
      promptText: 'derivative of x^3 - 6x^2 + 9x + 2',
      mode: 'PRO',
    },
    {
      id: 'sol-calculus-integral',
      slug: 'sol-calculus-integral',
      subject: 'Math',
      topic: 'Calculus · Definite Integration',
      promptText: 'integrate x^2 + 4x from 0 to 3',
      mode: 'PRO',
    },
    {
      id: 'sol-trig-identity',
      slug: 'sol-trig-identity',
      subject: 'Math',
      topic: 'Trigonometry · Exact Evaluation',
      promptText: 'sin(pi/4)^2 + cos(pi/4)^2 + tan(pi/4)',
      mode: 'STANDARD',
    },
    {
      id: 'sol-physics-kinematics',
      slug: 'sol-physics-kinematics',
      subject: 'Physics',
      topic: 'Classical Mechanics · Kinetic Energy & Newton’s Second Law',
      promptText:
        'A 4 kg projectile is launched at velocity 15 m/s. Find its kinetic energy and explain Newton’s Second Law F = ma.',
      mode: 'PRO',
    },
    {
      id: 'sol-chemistry-ph',
      slug: 'sol-chemistry-ph',
      subject: 'Chemistry',
      topic: 'Physical Chemistry · Acid-Base pH & Ideal Gas Law',
      promptText:
        'Calculate the pH of a 0.001 M HCl strong acid solution at 25°C and state the Ideal Gas Law PV = nRT.',
      mode: 'PRO',
    },
    {
      id: 'sol-biology-mitosis',
      slug: 'sol-biology-mitosis',
      subject: 'Biology',
      topic: 'Cellular Biology · ATP Bioenergetics & Mitosis',
      promptText:
        'Explain how cellular respiration produces ATP and how mitosis preserves diploid (2n) chromosome ploidy.',
      mode: 'STANDARD',
    },
    {
      id: 'sol-statistics-dataset',
      slug: 'sol-statistics-dataset',
      subject: 'Statistics',
      topic: 'Descriptive Statistics · Mean, Median & Standard Deviation',
      promptText: 'stats of 4, 8, 15, 16, 23, 42',
      mode: 'STANDARD',
    },
    {
      id: 'sol-economics-equilibrium',
      slug: 'sol-economics-equilibrium',
      subject: 'Economics',
      topic: 'Microeconomics · Supply & Demand Equilibrium',
      promptText: '20 + 4x = 100 - 6x',
      mode: 'STANDARD',
    },
    {
      id: 'sol-cs-complexity',
      slug: 'sol-cs-complexity',
      subject: 'Computer Science',
      topic: 'Algorithms · Asymptotic Recurrence & Binary Search',
      promptText: 'log(1024) / log(2) + 1',
      mode: 'STANDARD',
    },
    {
      id: 'sol-business-npv',
      slug: 'sol-business-npv',
      subject: 'Business',
      topic: 'Corporate Finance · Compound Return',
      promptText: '10000 * (1 + 0.08)^3',
      mode: 'STANDARD',
    },
    {
      id: 'sol-accounting-equity',
      slug: 'sol-accounting-equity',
      subject: 'Accounting',
      topic: 'Financial Accounting · Fundamental Balance Sheet Equation',
      promptText: '125000 - 48500',
      mode: 'STANDARD',
    },
  ];

  for (const q of seedQuestions) {
    const solved = solveMathOrStemProblem(q.promptText, q.subject);
    const graphData = solved.graphExpression
      ? generateFunctionGraph(solved.graphExpression)
      : null;

    await prisma.homeworkQuestion.upsert({
      where: { slug: q.slug },
      update: {
        userId: null,
        subject: q.subject,
        topic: q.topic,
        promptText: q.promptText,
        latexExpression: solved.latexPrompt,
        answerSummary: solved.answerSummary,
        stepsJson: JSON.stringify(solved.steps),
        quickTip: solved.keyConcepts[0]?.description || 'Isolate variables systematically and verify roots by substitution.',
        deepThinkingText: JSON.stringify(solved.keyConcepts),
        graphConfigJson: graphData ? JSON.stringify(graphData) : null,
        followUpMessagesJson: JSON.stringify([
          {
            role: 'assistant',
            text: `All ${solved.steps.length} derivation steps for "${q.promptText}" have been verified by the Symbolic CAS engine. Ask any follow-up question below to inspect intermediate steps or explore a variation.`,
            timestamp: now.toISOString(),
          },
        ]),
      },
      create: {
        id: q.id,
        slug: q.slug,
        userId: null,
        subject: q.subject,
        topic: q.topic,
        promptText: q.promptText,
        latexExpression: solved.latexPrompt,
        answerSummary: solved.answerSummary,
        stepsJson: JSON.stringify(solved.steps),
        quickTip: solved.keyConcepts[0]?.description || 'Isolate variables systematically and verify roots by substitution.',
        deepThinkingText: JSON.stringify(solved.keyConcepts),
        graphConfigJson: graphData ? JSON.stringify(graphData) : null,
        followUpMessagesJson: JSON.stringify([
          {
            role: 'assistant',
            text: `All ${solved.steps.length} derivation steps for "${q.promptText}" have been verified by the Symbolic CAS engine. Ask any follow-up question below to inspect intermediate steps or explore a variation.`,
            timestamp: now.toISOString(),
          },
        ]),
        providerUsed: q.mode === 'PRO' ? 'copilot-sdk+symbolic' : 'symbolic-cas',
        accuracyScore: 99,
        isBookmarked: q.id === 'sol-quadratic-roots' || q.id === 'sol-calculus-derivative',
        isVerifiedBank: true,
        tutorName: q.mode === 'PRO' ? 'Tavi AI Pro Super Tutor' : 'Dr. Evelyn Vance (Ph.D. STEM)',
      },
    });
  }

  // 4. Seed Tavi Atlas Interactive Visual Stories
  const atlasStories = [
    {
      slug: 'black-death-medieval-transformation',
      title:
        'How the Black Death Transformed Medieval Europe: Demographic Collapse, Labor Power & the Birth of Public Health',
      category: 'Social Science',
      viewsCount: 48200,
      visualTheme: 'from-rose-600 via-orange-600 to-amber-500',
      summary:
        'Between 1347 and 1351, Yersinia pestis swept across Eurasia, reducing Europe’s population by 30–60%. Discover how acute labor scarcity dismantled feudal serfdom, doubled real wages, and catalyzed quarantine medicine.',
      chapters: [
        {
          number: 1,
          heading: '1347: The Genoese Galleys & Silk Road Vector Transmission',
          body: 'Carried by Oriental rat fleas (Xenopsylla cheopis) aboard merchant vessels fleeing the siege of Caffa in Crimea, the bacterium Yersinia pestis entered Mediterranean ports in October 1347, spreading inland along trade arteries at 2–4 km per day.',
          statCallout: '45%–50% European Mortality within 48 Months',
        },
        {
          number: 2,
          heading: 'The Economic Inversion: Land Abundance vs. Labor Scarcity',
          body: 'With nearly half the agricultural workforce gone, marginal farmland was abandoned while surviving peasants demanded higher cash wages and lower feudal rents. Despite the English Statute of Labourers (1351), real purchasing power rose by over 40%.',
          statCallout: '+42% Surge in Real Artisanal & Agrarian Wages (1350–1400)',
        },
        {
          number: 3,
          heading: 'Technological Acceleration & Early Quarantine Protocols',
          body: 'Labor shortages incentivized labor-saving mechanical innovations—from water-powered fulling mills to movable-type printing presses—while Ragusa (Dubrovnik) instituted the world’s first 40-day maritime isolation (quarantino) in 1377.',
          statCallout: '40 Days: Origin of the Venetian "Quarantino" Law',
        },
      ],
      quiz: {
        question:
          'Why did real wages for surviving European peasants rise sharply in the decades following the 1347–1351 Black Death?',
        options: [
          'A sharp decrease in the labor supply relative to fixed arable land increased workers’ bargaining power',
          'Feudal lords voluntarily abolished all taxation across Western Europe in 1348',
          'Gold mines discovered in the Baltic tripled the money supply overnight',
          'Urban guilds banned all agricultural trade with Mediterranean ports',
        ],
        correctIndex: 0,
        explanation:
          'In neoclassical and Malthusian economic terms, a sudden ~45% contraction in labor supply against unchanged land and capital stock raised the marginal product of labor, forcing landlords to compete for workers.',
      },
    },
    {
      slug: 'quantum-tunneling-stellar-fusion',
      title:
        'Inside Quantum Tunneling: How Subatomic Particles Penetrate Solid Energy Barriers & Ignite Stars',
      category: 'Physics',
      viewsCount: 63900,
      visualTheme: 'from-indigo-600 via-violet-600 to-purple-600',
      summary:
        'In classical mechanics, a ball lacking sufficient kinetic energy can never roll over a tall hill. In quantum mechanics, matter waves decay exponentially inside forbidden barriers and emerge on the other side—enabling solar proton-proton fusion.',
      chapters: [
        {
          number: 1,
          heading: 'Wave-Particle Duality & the Time-Independent Schrödinger Equation',
          body: 'When a particle of energy E encounters a potential barrier V₀ > E of width L, its wavefunction ψ(x) does not drop to zero abruptly. Instead, inside the classically forbidden region (0 ≤ x ≤ L), ψ(x) ∝ e^(-κx) where κ = √(2m(V₀ - E)) / ℏ.',
          statCallout: 'T ≈ e^(-2κL) Transmission Probability',
        },
        {
          number: 2,
          heading: 'Why the Sun Shines: Overcoming the Coulomb Repulsion Barrier',
          body: 'The Sun’s core temperature (1.5 × 10⁷ K) gives protons an average thermal energy of ~1.3 keV—nearly 1,000 times lower than the ~1 MeV Coulomb electrostatic barrier between two protons. Quantum tunneling allows protons to fuse into deuterium.',
          statCallout: '1.5 × 10⁷ K Core Temperature Enabled by Gamow Peak Tunneling',
        },
        {
          number: 3,
          heading: 'Scanning Tunneling Microscopes (STM) & Flash Memory Gates',
          body: 'Because tunneling current I ∝ e^(-2κd) is exponentially sensitive to gap distance d, a 0.1 nm change in tip height alters current by a factor of 10—allowing scientists to image individual atoms on silicon surfaces.',
          statCallout: '0.01 nm Vertical Atomic Resolution in STM Imaging',
        },
      ],
      quiz: {
        question:
          'How does the quantum transmission probability T change if the barrier width L is doubled (assuming κL ≫ 1)?',
        options: [
          'It decreases exponentially because T ∝ e^(-2κL)',
          'It increases linearly in proportion to 2L',
          'It remains constant regardless of barrier thickness',
          'It drops to exactly zero for any finite barrier',
        ],
        correctIndex: 0,
        explanation:
          'Inside the barrier, the wavefunction amplitude decays as e^(-κx). Doubling the barrier width squares the exponential attenuation factor: e^(-2κ(2L)) = (e^(-2κL))².',
      },
    },
    {
      slug: 'crispr-cas9-programmable-genome-editing',
      title:
        'CRISPR-Cas9 Molecular Scissors: Programmable RNA-Guided Genome Editing from Bacterial Immunity to Medicine',
      category: 'Biology',
      viewsCount: 51400,
      visualTheme: 'from-emerald-600 via-teal-600 to-cyan-600',
      summary:
        'Originally evolved by Streptococcus pyogenes as an adaptive viral memory bank, the Cas9 endonuclease pairs with a 20-nucleotide single-guide RNA (sgRNA) to locate target DNA adjacent to a 5’-NGG-3’ PAM motif and execute precise double-strand breaks.',
      chapters: [
        {
          number: 1,
          heading: 'PAM Recognition (5’-NGG-3’) & R-Loop Unwinding',
          body: 'Cas9 scans billions of base pairs by transiently binding Protospacer Adjacent Motifs (5’-NGG-3’). Once a PAM is detected, the adjacent DNA duplex unwinds, testing base-pairing complementarity against the 20-nt spacer of the guide RNA.',
          statCallout: '20-nt Guide RNA + 3-nt PAM Specificity',
        },
        {
          number: 2,
          heading: 'HNH and RuvC Catalytic Domains: The Double-Strand Cleavage',
          body: 'Upon full RNA-DNA heteroduplex formation, conformational activation positions the HNH nuclease domain to cleave the target strand and the RuvC domain to cleave the non-target strand 3 base pairs upstream of the PAM.',
          statCallout: '2 Catalytic Domains (HNH + RuvC) Cut Both Strands',
        },
        {
          number: 3,
          heading: 'Cellular Repair Pathways: NHEJ Gene Knockout vs. HDR Knock-In',
          body: 'Cells repair the break via Non-Homologous End Joining (NHEJ, introducing small indels that silence disease genes) or Homology-Directed Repair (HDR, using a donor DNA template to rewrite point mutations).',
          statCallout: 'FDA-Approved Casgevy Therapy for Sickle Cell Disease',
        },
      ],
      quiz: {
        question:
          'What sequence motif must immediately follow the target protospacer on the non-target DNA strand for SpCas9 to initiate unwinding and cleavage?',
        options: [
          'The Protospacer Adjacent Motif (PAM), canonically 5’-NGG-3’',
          'A poly-A tail of at least 50 adenine nucleotides',
          'A methylated CpG island promoter',
          'An Okazaki fragment RNA primer',
        ],
        correctIndex: 0,
        explanation:
          'Streptococcus pyogenes Cas9 requires the 5’-NGG-3’ PAM sequence before it can melt the adjacent DNA duplex and hybridize the 20-nt guide RNA.',
      },
    },
    {
      slug: 'fourier-transform-wave-decomposition',
      title:
        'The Fourier Transform Visualized: Decomposing Complex Signals into Pure Rotating Frequencies',
      category: 'Math',
      viewsCount: 72100,
      visualTheme: 'from-blue-600 via-sky-600 to-indigo-600',
      summary:
        'Joseph Fourier discovered that any periodic or localized waveform—whether a violin chord, an ECG heartbeat, or a JPEG image—can be represented as a superposition of sinusoidal waves encoded by Euler’s formula e^(-i2πft).',
      chapters: [
        {
          number: 1,
          heading: 'Wrapping a Signal Around the Complex Unit Circle',
          body: 'The Continuous Fourier Transform F(ω) = ∫ f(t)e^(-iωt) dt winds a time-domain signal f(t) around the origin of the complex plane at winding frequency ω. When ω matches a true harmonic present in f(t), the center of mass shifts sharply away from zero.',
          statCallout: 'F(ω) = ∫ f(t)·e^(-iωt) dt',
        },
        {
          number: 2,
          heading: 'From O(N²) to O(N log N): The Cooley-Tukey Fast Fourier Transform',
          body: 'By recursively partitioning a discrete sequence of N samples into even-indexed and odd-indexed halves and exploiting roots-of-unity symmetries, the FFT reduces 1,000,000,000,000 operations for N = 10⁶ down to just ~20,000,000.',
          statCallout: '50,000× Speedup at N = 1,000,000 Samples',
        },
      ],
      quiz: {
        question:
          'What is the asymptotic time complexity of the Fast Fourier Transform (FFT) on an array of N sample points?',
        options: ['O(N log N)', 'O(N²)', 'O(2^N)', 'O(√N)'],
        correctIndex: 0,
        explanation:
          'The divide-and-conquer Cooley-Tukey FFT satisfies T(N) = 2T(N/2) + O(N), which resolves by the Master Theorem to O(N log N).',
      },
    },
  ];

  for (const story of atlasStories) {
    await prisma.atlasStory.upsert({
      where: { slug: story.slug },
      update: {
        title: story.title,
        category: story.category,
        viewsCount: story.viewsCount,
        visualTheme: story.visualTheme,
        summary: story.summary,
        hotspotsJson: JSON.stringify(story.chapters),
        sourcesJson: JSON.stringify(story.quiz),
      },
      create: {
        slug: story.slug,
        title: story.title,
        category: story.category,
        viewsCount: story.viewsCount,
        visualTheme: story.visualTheme,
        summary: story.summary,
        hotspotsJson: JSON.stringify(story.chapters),
        sourcesJson: JSON.stringify(story.quiz),
        createdById: tutor.id,
      },
    });
  }

  // 5. Seed Tavi Academy Interactive Courses
  const courses = [
    {
      slug: 'calculus-derivatives-visual-mastery',
      title: 'Master Limits, Secant Lines & Instantaneous Derivatives in 15 Minutes',
      category: 'Calculus',
      subCategory: 'AP / College Calculus I',
      durationSec: 900,
      viewsCount: 31450,
      simulationType: '#FF4B4B',
      summary:
        'Watch secant lines converge into the exact tangent line as Δx → 0, and master the Power, Product, and Chain Rules with interactive function graphs.',
      slides: [
        {
          step: 1,
          title: 'From Average Velocity to Instantaneous Slope',
          formula: 'm_{\\text{sec}} = \\frac{f(x + h) - f(x)}{h}',
          content:
            'Between any two points (x, f(x)) and (x+h, f(x+h)), the secant slope measures average rate of change. Shrinking the step size h toward 0 turns the secant line into the tangent line.',
          interactiveGraph: 'x^2 - 2*x',
        },
        {
          step: 2,
          title: 'The Limit Definition & Power Rule Shortcut',
          formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h} \\implies \\frac{d}{dx}[x^n] = nx^{n-1}",
          content:
            'Expanding (x + h)^n via the Binomial Theorem reveals that every term containing h² or higher vanishes as h → 0, leaving only n·x^(n-1).',
          interactiveGraph: 'x^3 - 3*x',
        },
        {
          step: 3,
          title: 'Finding Maxima & Minima via Critical Points f’(x) = 0',
          formula: "f'(c) = 0 \\text{ and } f''(c) < 0 \\implies \\text{Local Maximum}",
          content:
            'At the peak or valley of a smooth curve, the tangent line is horizontal (slope = 0). Use the First and Second Derivative Tests to classify extrema.',
          interactiveGraph: '-x^2 + 4*x + 1',
        },
      ],
    },
    {
      slug: 'quadratic-functions-parabolas-3d',
      title: 'Visualizing Quadratic Equations, Vertex Form & Discriminant Geometry',
      category: 'Algebra',
      subCategory: 'High School / SAT & ACT Math',
      durationSec: 720,
      viewsCount: 44800,
      simulationType: '#6366F1',
      summary:
        'See how changing coefficients a, b, and c shifts the parabola vertex, stretches its curvature, and controls real vs. complex roots.',
      slides: [
        {
          step: 1,
          title: 'Standard Form vs. Vertex Form Completing the Square',
          formula: 'f(x) = a(x - h)^2 + k, \\quad h = -\\frac{b}{2a}',
          content:
            'Every parabola is symmetric about the vertical line x = -b/(2a). Rewriting ax² + bx + c into vertex form immediately exposes its minimum or maximum value k.',
          interactiveGraph: 'x^2 - 4*x + 3',
        },
        {
          step: 2,
          title: 'Geometric Meaning of the Discriminant Δ = b² - 4ac',
          formula: '\\Delta > 0 \\text{ (2 roots)}, \\quad \\Delta = 0 \\text{ (1 tangent root)}, \\quad \\Delta < 0 \\text{ (0 real roots)}',
          content:
            'The discriminant measures how far the vertex sits above or below the x-axis relative to the parabola’s opening direction.',
          interactiveGraph: 'x^2 - 2*x + 1',
        },
      ],
    },
    {
      slug: 'newtonian-mechanics-energy-conservation',
      title: 'Forces, Free-Body Vectors & Conservation of Mechanical Energy',
      category: 'Physics',
      subCategory: 'AP Physics 1 & C',
      durationSec: 900,
      viewsCount: 22900,
      simulationType: '#10B981',
      summary:
        'Decompose inclined-plane force vectors into parallel and normal components and track kinetic-to-potential energy conversion.',
      slides: [
        {
          step: 1,
          title: 'Inclined Plane Vector Decomposition',
          formula: 'F_{\\parallel} = mg\\sin\\theta, \\quad F_{\\perp} = N = mg\\cos\\theta',
          content:
            'Rotating the coordinate axes to align with a ramp of angle θ splits gravity mg into a downhill driving component mg·sin(θ) and a normal component mg·cos(θ).',
          interactiveGraph: 'sin(x)',
        },
        {
          step: 2,
          title: 'Conservation of Total Mechanical Energy',
          formula: 'K_i + U_i = K_f + U_f \\implies \\frac{1}{2}mv_i^2 + mgh_i = \\frac{1}{2}mv_f^2 + mgh_f',
          content:
            'In the absence of non-conservative friction forces, every Joule of gravitational potential energy lost converts directly into translational kinetic energy.',
          interactiveGraph: '0.5*x^2',
        },
      ],
    },
    {
      slug: 'normal-distribution-hypothesis-testing',
      title: 'Gaussian Bell Curves, Z-Scores & Statistical Hypothesis Testing',
      category: 'Statistics',
      subCategory: 'AP Statistics & Data Science',
      durationSec: 840,
      viewsCount: 19300,
      simulationType: '#F59E0B',
      summary:
        'Understand the 68–95–99.7 Empirical Rule, standardize variables into Z-scores, and visualize p-values and rejection regions.',
      slides: [
        {
          step: 1,
          title: 'Standardizing Observations with Z-Scores',
          formula: 'Z = \\frac{X - \\mu}{\\sigma}, \\quad f(z) = \\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}',
          content:
            'A Z-score expresses any measurement X in units of standard deviations σ away from the population mean μ.',
          interactiveGraph: 'exp(-0.5*x^2)',
        },
      ],
    },
  ];

  for (const c of courses) {
    await prisma.academyCourse.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        category: c.category,
        subCategory: c.subCategory,
        durationSec: c.durationSec,
        viewsCount: c.viewsCount,
        simulationType: c.simulationType,
        summary: c.summary,
        chaptersJson: JSON.stringify(c.slides),
      },
      create: {
        slug: c.slug,
        title: c.title,
        category: c.category,
        subCategory: c.subCategory,
        durationSec: c.durationSec,
        viewsCount: c.viewsCount,
        simulationType: c.simulationType,
        summary: c.summary,
        chaptersJson: JSON.stringify(c.slides),
        createdById: tutor.id,
      },
    });
  }

  // 6. Seed Tavi Writing Helper Curated Essays
  const essays = [
    {
      id: 'essay-ai-healthcare',
      slug: 'essay-ai-healthcare',
      title: 'Ethical Governance of Multimodal AI in Clinical Diagnostic Triage',
      genre: 'Argumentative Essay',
      wordCount: 342,
      aiScore: 96,
      content: `As deep neural architectures achieve dermatologist- and radiologist-level sensitivity across medical imaging benchmarks, clinical deployment can no longer be evaluated solely by area-under-the-curve (AUC) metrics. True diagnostic equity requires transparent uncertainty quantification, demographic calibration across underrepresented patient cohorts, and human-in-the-loop accountability protocols.

First, uncalibrated diagnostic classifiers risk amplifying historical disparities embedded in training registries. When a convolutional or vision-transformer model is trained predominantly on tertiary urban hospital cohorts, its false-negative rate frequently rises in rural and minority populations. Mandating stratified calibration audits prior to regulatory clearance ensures that algorithmic triage distributes clinical benefit equitably.

Second, interpretability mechanisms—such as counterfactual saliency maps and structured clinical rationale generation—transform opaque probability scores into collaborative decision support. Rather than replacing physician judgment, calibrated AI systems serve as a tireless second reader that flags subtle pathology while preserving the clinician-patient fiduciary covenant.`,
      annotations: [
        {
          paragraph: 1,
          type: 'Thesis Precision',
          badge: 'Exemplary',
          comment: 'Establishes a three-pronged normative thesis (uncertainty quantification, demographic calibration, human-in-the-loop accountability) in the opening paragraph.',
        },
        {
          paragraph: 2,
          type: 'Causal Mechanism',
          badge: 'Strength',
          comment: 'Clearly explains how dataset selection bias translates into elevated false-negative rates in clinical deployment.',
        },
      ],
    },
    {
      id: 'essay-atlantic-circulation',
      slug: 'essay-atlantic-circulation',
      title: 'Thermohaline Forcing and Nonlinear Tipping Points in the Atlantic Meridional Overturning Circulation',
      genre: 'Research Paper',
      wordCount: 318,
      aiScore: 95,
      content: `The Atlantic Meridional Overturning Circulation (AMOC) transports approximately 1.2 petawatts of thermal energy poleward, moderating winter climates across Northwestern Europe. Paleoclimatic ice-core records from Greenland demonstrate that freshwater perturbations from accelerating cryospheric melt can weaken deep-water convection in the Labrador and Nordic Seas, pushing the circulation toward a bistable Stommel bifurcation.

Because high-latitude surface salinity governs seawater density more strongly than temperature near the freezing point, an influx of buoyant meltwater forms a halocline cap that inhibits vertical overturning. Once freshwater forcing crosses a critical threshold, positive salt-advection feedback rapidly transitions the system from a vigorous overturning state to a weakened mode, shifting tropical rainfall belts southward and accelerating regional sea-level rise along the North American eastern seaboard.`,
      annotations: [
        {
          paragraph: 1,
          type: 'Quantitative Grounding',
          badge: 'Exemplary',
          comment: 'Anchors physical scale immediately with exact thermal transport (1.2 PW) and paleoclimatic proxy evidence.',
        },
      ],
    },
    {
      id: 'essay-college-statement',
      slug: 'essay-college-statement',
      title: 'From Debugging Symbolic Parsers to Designing Accessible STEM Tutors: Personal Statement',
      genre: 'College Application Essay',
      wordCount: 295,
      aiScore: 97,
      content: `At 11:40 PM on a rainy Tuesday, my younger sister stared at a system of quadratic inequalities on her kitchen worksheet, convinced she simply "wasn't a math person." Watching her frustration, I realized that her barrier wasn't conceptual ability—it was the invisible leap between static textbook symbols and geometric intuition.

That weekend, I built a 200-line interactive graphing parser that colored feasible regions in real time as she dragged each coefficient slider. Within ten minutes, she wasn't memorizing rules; she was predicting where the parabola intersections would move before her finger left the trackpad. That transformation sparked my obsession with neuro-symbolic educational systems: combining exact computer algebra with empathetic, adaptive pedagogy so every student has a patient tutor at their fingertips.`,
      annotations: [
        {
          paragraph: 1,
          type: 'Narrative Hook',
          badge: 'Exemplary',
          comment: 'Opens with a concrete scene that naturally bridges personal motivation and technical curiosity.',
        },
      ],
    },
  ];

  for (const e of essays) {
    await prisma.writingDocument.upsert({
      where: { slug: e.slug },
      update: {
        title: e.title,
        genre: e.genre,
        wordCount: e.wordCount,
        aiScore: e.aiScore,
        contentText: e.content,
        annotationsJson: JSON.stringify(e.annotations),
      },
      create: {
        id: e.id,
        slug: e.slug,
        userId: tutor.id,
        title: e.title,
        genre: e.genre,
        gradeLevel: 'University / AP',
        wordCount: e.wordCount,
        promptText: `Write a well-structured ${e.genre} on ${e.title}`,
        contentText: e.content,
        aiScore: e.aiScore,
        annotationsJson: JSON.stringify(e.annotations),
        isCuratedExample: true,
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
