// Seed curriculum: 5 subjects, each with a small prerequisite-ordered topic graph.
// Topic ids are namespaced by subject ("subject.slug"). `prerequisites` reference
// other topic ids and drive the adaptive engine's "drop to weakest prerequisite".

export type SeedSubject = {
  id: string;
  name: string;
  description: string;
  framing: string; // tone/approach guidance injected into the tutor prompt
  orderIndex: number;
};

export type SeedTopic = {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  prerequisites: string[];
  orderIndex: number;
};

export const SUBJECTS: SeedSubject[] = [
  {
    id: "philosophy",
    name: "Philosophy",
    description: "Reasoning about knowledge, reality, ethics, mind, and society.",
    framing:
      "Teach Socratically. Favor probing questions, thought experiments, and steelmanning opposing views before evaluating them. Encourage careful definitions and argument structure.",
    orderIndex: 0,
  },
  {
    id: "psychology",
    name: "Psychology",
    description: "The scientific study of mind, brain, and behavior.",
    framing:
      "Ground claims in research methods and evidence. Use everyday examples, classic studies, and ask the student to predict outcomes before revealing findings. Flag correlation-vs-causation.",
    orderIndex: 1,
  },
  {
    id: "ai",
    name: "Artificial Intelligence",
    description: "How machines search, learn, and reason — from algorithms to LLMs.",
    framing:
      "Build intuition first, then formalize. Use small concrete examples and analogies, then connect to math/code. Distinguish hype from mechanism.",
    orderIndex: 2,
  },
  {
    id: "physics",
    name: "Physics",
    description: "Models of motion, energy, fields, and the structure of reality.",
    framing:
      "Use worked examples with explicit units and reasoning steps. Start from intuition and diagrams, then equations. Ask the student to estimate and sanity-check magnitudes.",
    orderIndex: 3,
  },
  {
    id: "coding",
    name: "Coding",
    description: "Programming fundamentals, data structures, algorithms, and craft.",
    framing:
      "Favor worked examples and small runnable snippets. Encourage the student to predict output, then explain. Emphasize reading errors, testing, and incremental problem-solving.",
    orderIndex: 4,
  },
  {
    id: "organic-chemistry",
    name: "Organic Chemistry",
    description: "The structure, properties, and reactions of carbon-based molecules.",
    framing:
      "Emphasize structure-reactivity relationships and electron-pushing (curved-arrow) mechanisms. Describe structures clearly in words, ask the student to predict products and identify nucleophiles/electrophiles, and reason from functional groups rather than memorization.",
    orderIndex: 5,
  },
  {
    id: "health-nutrition",
    name: "Health & Nutrition",
    description: "How food, activity, and lifestyle affect the body, grounded in physiology and evidence.",
    framing:
      "Ground claims in physiology and high-quality evidence. Distinguish established science from fads and correlation from causation. Use practical, real-food examples, respect individual variation, and avoid giving prescriptive medical advice — frame guidance as general education.",
    orderIndex: 6,
  },
  {
    id: "biology",
    name: "Biology",
    description: "Life across scales, from molecules and cells to organisms and ecosystems.",
    framing:
      "Connect structure to function at every scale and treat evolution as the unifying theme. Use real organisms and concrete examples, draw structures in words, and ask the student to predict and explain before confirming.",
    orderIndex: 7,
  },
];

export const TOPICS: SeedTopic[] = [
  // ---- Philosophy ----
  { id: "philosophy.logic", subjectId: "philosophy", name: "Logic & Argument", description: "Validity, soundness, premises, conclusions, and common fallacies.", prerequisites: [], orderIndex: 0 },
  { id: "philosophy.epistemology", subjectId: "philosophy", name: "Epistemology", description: "Knowledge, justification, belief, and skepticism.", prerequisites: ["philosophy.logic"], orderIndex: 1 },
  { id: "philosophy.metaphysics", subjectId: "philosophy", name: "Metaphysics", description: "Existence, identity, causation, free will, and time.", prerequisites: ["philosophy.epistemology"], orderIndex: 2 },
  { id: "philosophy.ethics", subjectId: "philosophy", name: "Ethics", description: "Consequentialism, deontology, virtue ethics, and metaethics.", prerequisites: ["philosophy.logic"], orderIndex: 3 },
  { id: "philosophy.mind", subjectId: "philosophy", name: "Philosophy of Mind", description: "Consciousness, dualism, functionalism, and the mind-body problem.", prerequisites: ["philosophy.epistemology", "philosophy.metaphysics"], orderIndex: 4 },
  { id: "philosophy.political", subjectId: "philosophy", name: "Political Philosophy", description: "Justice, liberty, rights, and the legitimacy of the state.", prerequisites: ["philosophy.ethics"], orderIndex: 5 },

  // ---- Psychology ----
  { id: "psychology.methods", subjectId: "psychology", name: "Research Methods", description: "Experiments, variables, validity, and statistics basics.", prerequisites: [], orderIndex: 0 },
  { id: "psychology.cognition", subjectId: "psychology", name: "Cognition", description: "Attention, perception, reasoning, and decision-making.", prerequisites: ["psychology.methods"], orderIndex: 1 },
  { id: "psychology.learning", subjectId: "psychology", name: "Learning & Memory", description: "Conditioning, encoding, retrieval, and forgetting.", prerequisites: ["psychology.cognition"], orderIndex: 2 },
  { id: "psychology.development", subjectId: "psychology", name: "Developmental Psychology", description: "How cognition, attachment, and identity change across the lifespan.", prerequisites: ["psychology.methods"], orderIndex: 3 },
  { id: "psychology.social", subjectId: "psychology", name: "Social Psychology", description: "Attitudes, conformity, persuasion, and group behavior.", prerequisites: ["psychology.methods"], orderIndex: 4 },
  { id: "psychology.clinical", subjectId: "psychology", name: "Clinical Psychology", description: "Disorders, diagnosis, and evidence-based treatment.", prerequisites: ["psychology.cognition", "psychology.development"], orderIndex: 5 },

  // ---- AI ----
  { id: "ai.intro", subjectId: "ai", name: "Foundations of AI", description: "Agents, environments, rationality, and the history of AI.", prerequisites: [], orderIndex: 0 },
  { id: "ai.search", subjectId: "ai", name: "Search & Problem Solving", description: "State spaces, BFS/DFS, A*, and heuristics.", prerequisites: ["ai.intro"], orderIndex: 1 },
  { id: "ai.ml", subjectId: "ai", name: "Machine Learning", description: "Supervised vs unsupervised, training, loss, and generalization.", prerequisites: ["ai.intro"], orderIndex: 2 },
  { id: "ai.neural", subjectId: "ai", name: "Neural Networks", description: "Neurons, layers, backpropagation, and gradient descent.", prerequisites: ["ai.ml"], orderIndex: 3 },
  { id: "ai.llms", subjectId: "ai", name: "Large Language Models", description: "Tokens, transformers, attention, and prompting.", prerequisites: ["ai.neural"], orderIndex: 4 },
  { id: "ai.ethics", subjectId: "ai", name: "AI Ethics & Safety", description: "Bias, alignment, transparency, and societal impact.", prerequisites: ["ai.intro"], orderIndex: 5 },

  // ---- Physics ----
  { id: "physics.mechanics", subjectId: "physics", name: "Classical Mechanics", description: "Kinematics, forces, and Newton's laws.", prerequisites: [], orderIndex: 0 },
  { id: "physics.energy", subjectId: "physics", name: "Energy & Momentum", description: "Work, energy conservation, momentum, and collisions.", prerequisites: ["physics.mechanics"], orderIndex: 1 },
  { id: "physics.thermo", subjectId: "physics", name: "Thermodynamics", description: "Heat, temperature, entropy, and the laws of thermodynamics.", prerequisites: ["physics.energy"], orderIndex: 2 },
  { id: "physics.waves", subjectId: "physics", name: "Waves & Optics", description: "Oscillations, wave behavior, interference, and light.", prerequisites: ["physics.mechanics"], orderIndex: 3 },
  { id: "physics.em", subjectId: "physics", name: "Electromagnetism", description: "Charge, fields, circuits, and electromagnetic induction.", prerequisites: ["physics.energy"], orderIndex: 4 },
  { id: "physics.modern", subjectId: "physics", name: "Modern Physics", description: "Relativity and quantum basics.", prerequisites: ["physics.em", "physics.energy"], orderIndex: 5 },

  // ---- Coding ----
  { id: "coding.basics", subjectId: "coding", name: "Programming Basics", description: "Variables, types, control flow, and functions.", prerequisites: [], orderIndex: 0 },
  { id: "coding.data-structures", subjectId: "coding", name: "Data Structures", description: "Arrays, lists, stacks, queues, maps, and trees.", prerequisites: ["coding.basics"], orderIndex: 1 },
  { id: "coding.algorithms", subjectId: "coding", name: "Algorithms", description: "Searching, sorting, recursion, and Big-O complexity.", prerequisites: ["coding.data-structures"], orderIndex: 2 },
  { id: "coding.oop", subjectId: "coding", name: "Object-Oriented Programming", description: "Objects, classes, encapsulation, inheritance, polymorphism.", prerequisites: ["coding.basics"], orderIndex: 3 },
  { id: "coding.web", subjectId: "coding", name: "Web Fundamentals", description: "HTTP, HTML/CSS/JS, client vs server, and APIs.", prerequisites: ["coding.basics"], orderIndex: 4 },
  { id: "coding.testing", subjectId: "coding", name: "Debugging & Testing", description: "Reading errors, unit tests, and systematic debugging.", prerequisites: ["coding.basics"], orderIndex: 5 },

  // ---- Organic Chemistry ----
  { id: "organic-chemistry.bonding", subjectId: "organic-chemistry", name: "Bonding & Hybridization", description: "Covalent bonds, sp3/sp2/sp hybridization, sigma and pi bonds.", prerequisites: [], orderIndex: 0 },
  { id: "organic-chemistry.structure", subjectId: "organic-chemistry", name: "Structure & Nomenclature", description: "Skeletal structures, IUPAC naming, and constitutional isomers.", prerequisites: ["organic-chemistry.bonding"], orderIndex: 1 },
  { id: "organic-chemistry.functional-groups", subjectId: "organic-chemistry", name: "Functional Groups", description: "Alcohols, amines, carbonyls, carboxylic acids and their behavior.", prerequisites: ["organic-chemistry.structure"], orderIndex: 2 },
  { id: "organic-chemistry.stereochemistry", subjectId: "organic-chemistry", name: "Stereochemistry", description: "Chirality, enantiomers, diastereomers, and R/S configuration.", prerequisites: ["organic-chemistry.structure"], orderIndex: 3 },
  { id: "organic-chemistry.acids-bases", subjectId: "organic-chemistry", name: "Acids, Bases & Reactivity", description: "pKa, nucleophiles and electrophiles, and predicting reactivity.", prerequisites: ["organic-chemistry.functional-groups"], orderIndex: 4 },
  { id: "organic-chemistry.mechanisms", subjectId: "organic-chemistry", name: "Reaction Mechanisms", description: "Curved-arrow notation, intermediates, and transition states.", prerequisites: ["organic-chemistry.acids-bases"], orderIndex: 5 },
  { id: "organic-chemistry.substitution-elimination", subjectId: "organic-chemistry", name: "Substitution & Elimination", description: "SN1, SN2, E1, and E2 reactions and what controls them.", prerequisites: ["organic-chemistry.mechanisms", "organic-chemistry.stereochemistry"], orderIndex: 6 },
  { id: "organic-chemistry.addition", subjectId: "organic-chemistry", name: "Addition Reactions", description: "Reactions of alkenes and alkynes, Markovnikov's rule.", prerequisites: ["organic-chemistry.mechanisms"], orderIndex: 7 },
  { id: "organic-chemistry.spectroscopy", subjectId: "organic-chemistry", name: "Spectroscopy", description: "Determining structure with IR, NMR, and mass spectrometry.", prerequisites: ["organic-chemistry.functional-groups"], orderIndex: 8 },

  // ---- Health & Nutrition ----
  { id: "health-nutrition.macronutrients", subjectId: "health-nutrition", name: "Macronutrients", description: "Carbohydrates, proteins, and fats: roles, sources, and quality.", prerequisites: [], orderIndex: 0 },
  { id: "health-nutrition.micronutrients", subjectId: "health-nutrition", name: "Micronutrients", description: "Vitamins and minerals, deficiencies, and food sources.", prerequisites: ["health-nutrition.macronutrients"], orderIndex: 1 },
  { id: "health-nutrition.energy-balance", subjectId: "health-nutrition", name: "Energy Balance & Metabolism", description: "Calories, BMR/TDEE, and how the body uses energy.", prerequisites: ["health-nutrition.macronutrients"], orderIndex: 2 },
  { id: "health-nutrition.digestion", subjectId: "health-nutrition", name: "Digestion & Absorption", description: "The GI tract, enzymes, and the gut microbiome.", prerequisites: ["health-nutrition.macronutrients"], orderIndex: 3 },
  { id: "health-nutrition.hydration", subjectId: "health-nutrition", name: "Hydration & Electrolytes", description: "Water balance, sodium, potassium, and why they matter.", prerequisites: [], orderIndex: 4 },
  { id: "health-nutrition.diet-patterns", subjectId: "health-nutrition", name: "Dietary Patterns", description: "Mediterranean, plant-based, and other evidence-based patterns.", prerequisites: ["health-nutrition.micronutrients", "health-nutrition.energy-balance"], orderIndex: 5 },
  { id: "health-nutrition.exercise", subjectId: "health-nutrition", name: "Exercise & Fitness", description: "Aerobic vs anaerobic training, protein needs, and recovery.", prerequisites: ["health-nutrition.energy-balance"], orderIndex: 6 },
  { id: "health-nutrition.sleep-wellbeing", subjectId: "health-nutrition", name: "Sleep & Well-being", description: "Sleep, stress, and their effect on health and appetite.", prerequisites: [], orderIndex: 7 },
  { id: "health-nutrition.evidence", subjectId: "health-nutrition", name: "Food Labels & Evidence", description: "Reading labels and evaluating nutrition claims critically.", prerequisites: ["health-nutrition.micronutrients"], orderIndex: 8 },

  // ---- Biology ----
  { id: "biology.chemistry-of-life", subjectId: "biology", name: "Chemistry of Life", description: "Water, pH, and the four classes of biological macromolecules.", prerequisites: [], orderIndex: 0 },
  { id: "biology.cells", subjectId: "biology", name: "Cell Biology", description: "Prokaryotic vs eukaryotic cells, organelles, and membranes.", prerequisites: ["biology.chemistry-of-life"], orderIndex: 1 },
  { id: "biology.energetics", subjectId: "biology", name: "Cellular Energetics", description: "Photosynthesis, cellular respiration, and ATP.", prerequisites: ["biology.cells"], orderIndex: 2 },
  { id: "biology.genetics", subjectId: "biology", name: "Genetics & Inheritance", description: "DNA, chromosomes, meiosis, and Mendelian inheritance.", prerequisites: ["biology.cells"], orderIndex: 3 },
  { id: "biology.molecular", subjectId: "biology", name: "Molecular Biology", description: "Replication, transcription, translation, and gene regulation.", prerequisites: ["biology.genetics"], orderIndex: 4 },
  { id: "biology.evolution", subjectId: "biology", name: "Evolution", description: "Natural selection, genetic drift, and speciation.", prerequisites: ["biology.genetics"], orderIndex: 5 },
  { id: "biology.physiology", subjectId: "biology", name: "Anatomy & Physiology", description: "Organ systems, homeostasis, and feedback loops.", prerequisites: ["biology.cells"], orderIndex: 6 },
  { id: "biology.ecology", subjectId: "biology", name: "Ecology", description: "Populations, communities, ecosystems, and energy flow.", prerequisites: ["biology.evolution"], orderIndex: 7 },
];

export const BLOOM_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
] as const;

export function bloomName(level: number): string {
  return BLOOM_LEVELS[Math.max(0, Math.min(5, level - 1))];
}
