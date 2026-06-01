/* ============================================================================
 * Vocabulary seed generator.
 *
 * Authors the IELTS vocabulary bank as compact JS data, then emits a single
 * idempotent SQL migration: supabase/migrations/010_vocabulary.sql
 *
 * Word tuple: [word, pos, ipa, definition, example, [synonyms], [antonyms], band]
 *   pos  : 'n' | 'v' | 'adj' | 'adv' | 'phrase'
 *   band : '6.5' | '7.0' | '7.5' | '8.0' | '8.5'
 *
 * Run:  node scripts/gen-vocab.mjs
 * ========================================================================== */
import { writeFileSync } from 'node:fs'

/* Deck metadata. `category` is 'topic' or 'function'. */
const DECKS = {
  education: {
    title: 'Education', category: 'topic', color: 'var(--info)',
    description: 'Schooling, learning and academic life — for Writing Task 2 and Speaking.',
    words: [
      ['curriculum', 'n', '/kəˈrɪkjələm/', 'The subjects that make up a course of study at a school or college.', 'The national curriculum places a heavy emphasis on science and mathematics.', ['syllabus', 'programme'], [], '7.0'],
      ['rote learning', 'phrase', '/rəʊt ˈlɜːnɪŋ/', 'Memorising information through repetition rather than understanding.', 'Critics argue that rote learning stifles a child’s natural curiosity.', ['memorisation', 'cramming'], ['active learning'], '7.5'],
      ['literacy', 'n', '/ˈlɪtərəsi/', 'The ability to read and write.', 'Adult literacy programmes have transformed employment prospects in rural areas.', ['reading ability'], ['illiteracy'], '6.5'],
      ['vocational', 'adj', '/vəʊˈkeɪʃənl/', 'Relating to training for a specific job or trade.', 'Vocational courses equip students with practical, job-ready skills.', ['practical', 'occupational'], ['academic'], '7.0'],
      ['pedagogy', 'n', '/ˈpedəɡɒdʒi/', 'The method and practice of teaching.', 'Modern pedagogy favours collaboration over passive listening.', ['teaching method'], [], '8.0'],
      ['truancy', 'n', '/ˈtruːənsi/', 'The act of staying away from school without permission.', 'Schools have introduced fines to combat persistent truancy.', ['absenteeism'], ['attendance'], '7.5'],
      ['holistic', 'adj', '/həˈlɪstɪk/', 'Considering the whole person or system rather than just one part.', 'A holistic education nurtures emotional as well as academic growth.', ['comprehensive', 'all-round'], ['narrow'], '7.5'],
      ['discipline', 'n', '/ˈdɪsəplɪn/', 'Controlled, orderly behaviour, or training that produces it.', 'Strict discipline in the classroom can either focus or intimidate pupils.', ['order', 'self-control'], ['disorder'], '6.5'],
      ['enrol', 'v', '/ɪnˈrəʊl/', 'To officially register as a member or student.', 'Thousands of mature students enrol on online degrees each year.', ['register', 'sign up'], ['withdraw'], '6.5'],
      ['scholarship', 'n', '/ˈskɒləʃɪp/', 'A grant of money to support a student’s education.', 'She won a full scholarship to study engineering abroad.', ['grant', 'bursary'], [], '6.5'],
      ['curiosity', 'n', '/ˌkjʊəriˈɒsəti/', 'A strong desire to learn or know something.', 'Good teachers spark curiosity rather than simply transmit facts.', ['inquisitiveness', 'interest'], ['indifference'], '7.0'],
      ['rigorous', 'adj', '/ˈrɪɡərəs/', 'Extremely thorough, careful and demanding.', 'Medical training is famously rigorous and competitive.', ['demanding', 'exacting'], ['lax', 'lenient'], '7.5'],
      ['aptitude', 'n', '/ˈæptɪtjuːd/', 'A natural ability or talent for something.', 'The test is designed to measure a candidate’s aptitude for languages.', ['talent', 'flair'], ['inability'], '7.5'],
      ['interactive', 'adj', '/ˌɪntərˈæktɪv/', 'Involving active participation between people or with technology.', 'Interactive whiteboards have made lessons far more engaging.', ['participatory', 'hands-on'], ['passive'], '6.5'],
      ['comprehension', 'n', '/ˌkɒmprɪˈhenʃn/', 'The ability to understand something.', 'Reading comprehension improves dramatically with daily practice.', ['understanding', 'grasp'], ['confusion'], '6.5'],
      ['tuition', 'n', '/tjuˈɪʃn/', 'Teaching, especially of an individual or small group; also course fees.', 'Private tuition has become a booming industry in many countries.', ['instruction', 'coaching'], [], '7.0'],
      ['underachieve', 'v', '/ˌʌndərəˈtʃiːv/', 'To do less well than one is capable of.', 'Boys are statistically more likely to underachieve at school.', ['underperform'], ['excel'], '7.5'],
      ['well-rounded', 'adj', '/ˌwel ˈraʊndɪd/', 'Having a wide range of abilities, interests or experiences.', 'Universities increasingly seek well-rounded rather than narrowly gifted applicants.', ['versatile', 'balanced'], ['one-dimensional'], '7.0'],
      ['mandatory', 'adj', '/ˈmændətəri/', 'Required by law or rules; compulsory.', 'In most countries, schooling is mandatory until the age of sixteen.', ['compulsory', 'obligatory'], ['optional', 'voluntary'], '7.0'],
      ['intellectual', 'adj', '/ˌɪntəˈlektʃuəl/', 'Relating to the ability to think and understand ideas.', 'Debating clubs offer valuable intellectual stimulation.', ['cerebral', 'cognitive'], [], '7.0'],
      ['nurture', 'v', '/ˈnɜːtʃə/', 'To care for and encourage the growth or development of someone.', 'Parents and teachers must work together to nurture a child’s talents.', ['foster', 'cultivate'], ['neglect', 'stifle'], '7.5'],
      ['streaming', 'n', '/ˈstriːmɪŋ/', 'Grouping pupils by ability into separate classes.', 'Streaming can motivate top students but discourage weaker ones.', ['setting', 'tracking'], ['mixed-ability'], '7.5'],
      ['proficiency', 'n', '/prəˈfɪʃnsi/', 'A high degree of skill or competence.', 'Employers now expect proficiency in at least one foreign language.', ['competence', 'mastery'], ['incompetence'], '7.5'],
      ['curtail', 'v', '/kɜːˈteɪl/', 'To reduce or restrict something.', 'Budget cuts have curtailed extracurricular activities in state schools.', ['restrict', 'cut back'], ['expand'], '8.0'],
      ['fee-paying', 'adj', '/ˈfiː ˌpeɪɪŋ/', 'Describing private schools that charge tuition.', 'Critics claim fee-paying schools entrench social inequality.', ['private', 'independent'], ['state'], '7.0'],
      ['lifelong', 'adj', '/ˈlaɪflɒŋ/', 'Continuing throughout a person’s life.', 'The internet has made lifelong learning accessible to almost everyone.', ['continuous', 'ongoing'], ['short-term'], '6.5'],
      ['cognitive', 'adj', '/ˈkɒɡnətɪv/', 'Relating to mental processes of thinking and learning.', 'Bilingual children often show enhanced cognitive flexibility.', ['mental', 'intellectual'], [], '8.0'],
      ['dropout', 'n', '/ˈdrɒpaʊt/', 'A person who leaves school or a course before finishing.', 'High dropout rates often reflect deeper social problems.', ['quitter', 'leaver'], ['graduate'], '7.0'],
      ['stimulating', 'adj', '/ˈstɪmjəleɪtɪŋ/', 'Encouraging interest, thought or enthusiasm.', 'A stimulating classroom environment keeps young learners engaged.', ['engaging', 'inspiring'], ['dull', 'tedious'], '7.0'],
    ],
  },

  environment: {
    title: 'Environment & Climate', category: 'topic', color: 'var(--accent)',
    description: 'Climate change, pollution and sustainability vocabulary for essays and discussion.',
    words: [
      ['sustainable', 'adj', '/səˈsteɪnəbl/', 'Able to continue over time without harming the environment.', 'Governments are under pressure to invest in sustainable energy.', ['eco-friendly', 'renewable'], ['unsustainable'], '7.0'],
      ['emissions', 'n', '/ɪˈmɪʃnz/', 'Gases or substances released into the atmosphere.', 'Carbon emissions must fall sharply to limit global warming.', ['discharge', 'output'], [], '6.5'],
      ['deforestation', 'n', '/ˌdiːˌfɒrɪˈsteɪʃn/', 'The clearing of forests on a large scale.', 'Deforestation in the Amazon threatens countless species.', ['clearance', 'logging'], ['reforestation'], '7.0'],
      ['biodiversity', 'n', '/ˌbaɪəʊdaɪˈvɜːsəti/', 'The variety of plant and animal life in a habitat.', 'Protecting biodiversity is essential for a stable ecosystem.', ['variety of life'], [], '7.5'],
      ['renewable', 'adj', '/rɪˈnjuːəbl/', 'Able to be replenished naturally, like solar or wind power.', 'Renewable sources now supply a third of the country’s electricity.', ['sustainable', 'green'], ['finite', 'fossil'], '6.5'],
      ['degradation', 'n', '/ˌdeɡrəˈdeɪʃn/', 'The process of damaging or lowering the quality of something.', 'Soil degradation is reducing crop yields across the region.', ['deterioration', 'decline'], ['restoration'], '7.5'],
      ['carbon footprint', 'phrase', '/ˈkɑːbən ˈfʊtprɪnt/', 'The total amount of greenhouse gases produced by an activity.', 'Cycling to work is a simple way to shrink your carbon footprint.', ['emissions impact'], [], '7.0'],
      ['conservation', 'n', '/ˌkɒnsəˈveɪʃn/', 'The protection of nature and natural resources.', 'Wildlife conservation depends heavily on local community support.', ['preservation', 'protection'], ['exploitation'], '6.5'],
      ['depletion', 'n', '/dɪˈpliːʃn/', 'The reduction of a resource until it runs low.', 'The depletion of fish stocks endangers coastal economies.', ['exhaustion', 'reduction'], ['replenishment'], '7.5'],
      ['ecosystem', 'n', '/ˈiːkəʊsɪstəm/', 'A community of living things and their environment.', 'Coral reefs support some of the richest ecosystems on Earth.', ['habitat', 'biome'], [], '7.0'],
      ['mitigate', 'v', '/ˈmɪtɪɡeɪt/', 'To make something less harmful or severe.', 'Planting trees can help mitigate the effects of climate change.', ['alleviate', 'reduce'], ['aggravate', 'worsen'], '8.0'],
      ['pollutant', 'n', '/pəˈluːtənt/', 'A substance that contaminates air, water or soil.', 'Industrial pollutants have poisoned the river for decades.', ['contaminant', 'toxin'], [], '7.0'],
      ['offset', 'v', '/ˌɒfˈset/', 'To counterbalance or compensate for something.', 'Airlines let passengers offset their flights by funding tree planting.', ['counterbalance', 'compensate'], [], '7.5'],
      ['greenhouse gas', 'phrase', '/ˈɡriːnhaʊs ɡæs/', 'A gas that traps heat in the atmosphere.', 'Methane is a far more potent greenhouse gas than carbon dioxide.', [], [], '6.5'],
      ['habitat', 'n', '/ˈhæbɪtæt/', 'The natural home of a plant or animal.', 'Urban sprawl is destroying the habitat of many native birds.', ['environment', 'home'], [], '6.5'],
      ['finite', 'adj', '/ˈfaɪnaɪt/', 'Limited in amount; not endless.', 'Fossil fuels are a finite resource that will eventually run out.', ['limited', 'exhaustible'], ['infinite', 'renewable'], '7.5'],
      ['contaminate', 'v', '/kənˈtæmɪneɪt/', 'To make something impure or poisonous.', 'Leaking pipelines can contaminate the local water supply.', ['pollute', 'taint'], ['purify'], '7.0'],
      ['eco-friendly', 'adj', '/ˈiːkəʊ ˈfrendli/', 'Not harmful to the environment.', 'The company has switched to eco-friendly packaging.', ['green', 'sustainable'], ['polluting'], '6.5'],
      ['extinction', 'n', '/ɪkˈstɪŋkʃn/', 'The state of a species no longer existing.', 'Several species face extinction within our lifetime.', ['dying out', 'eradication'], ['survival'], '7.0'],
      ['drought', 'n', '/draʊt/', 'A long period of abnormally low rainfall.', 'Prolonged drought has devastated the harvest this year.', ['dry spell', 'water shortage'], ['flood'], '6.5'],
      ['exacerbate', 'v', '/ɪɡˈzæsəbeɪt/', 'To make a problem or bad situation worse.', 'Burning coal will only exacerbate air pollution in cities.', ['aggravate', 'worsen'], ['alleviate', 'ease'], '8.0'],
      ['scarcity', 'n', '/ˈskeəsəti/', 'A shortage or insufficient supply of something.', 'Water scarcity could trigger conflicts in the coming decades.', ['shortage', 'dearth'], ['abundance'], '7.5'],
      ['recycle', 'v', '/ˌriːˈsaɪkl/', 'To process waste so it can be used again.', 'Households are encouraged to recycle glass, paper and plastic.', ['reuse', 'reprocess'], ['discard'], '6.5'],
      ['fragile', 'adj', '/ˈfrædʒaɪl/', 'Easily damaged or destroyed; delicate.', 'The Arctic is a fragile environment highly sensitive to warming.', ['delicate', 'vulnerable'], ['robust', 'resilient'], '7.0'],
      ['sustainability', 'n', '/səˌsteɪnəˈbɪləti/', 'The ability to maintain something without depleting resources.', 'Sustainability has become central to corporate strategy.', ['viability'], [], '7.5'],
      ['hazardous', 'adj', '/ˈhæzədəs/', 'Dangerous or risky, especially to health.', 'Hazardous waste must be disposed of under strict regulation.', ['dangerous', 'perilous'], ['safe', 'harmless'], '7.0'],
      ['replenish', 'v', '/rɪˈplenɪʃ/', 'To fill something up again or restore a supply.', 'Aquifers take centuries to replenish once they are drained.', ['refill', 'restore'], ['deplete'], '8.0'],
      ['arable', 'adj', '/ˈærəbl/', 'Suitable for growing crops.', 'Climate change is shrinking the world’s arable land.', ['fertile', 'cultivable'], ['barren'], '8.0'],
      ['catastrophic', 'adj', '/ˌkætəˈstrɒfɪk/', 'Involving sudden, large-scale disaster.', 'Unchecked warming could have catastrophic consequences.', ['disastrous', 'devastating'], ['harmless'], '7.5'],
    ],
  },

  technology: {
    title: 'Technology & Internet', category: 'topic', color: '#6b46c1',
    description: 'Digital life, automation and the internet — common across all IELTS modules.',
    words: [
      ['automation', 'n', '/ˌɔːtəˈmeɪʃn/', 'The use of machines to do work previously done by people.', 'Automation is reshaping factories and threatening some jobs.', ['mechanisation'], ['manual labour'], '7.0'],
      ['innovation', 'n', '/ˌɪnəˈveɪʃn/', 'A new method, idea or product.', 'Constant innovation keeps technology companies ahead of rivals.', ['invention', 'breakthrough'], ['stagnation'], '6.5'],
      ['obsolete', 'adj', '/ˈɒbsəliːt/', 'No longer in use because something newer exists.', 'Smartphones have rendered many gadgets obsolete.', ['outdated', 'antiquated'], ['current', 'modern'], '7.5'],
      ['cutting-edge', 'adj', '/ˈkʌtɪŋ edʒ/', 'At the most advanced stage of development.', 'The lab uses cutting-edge artificial intelligence.', ['state-of-the-art', 'advanced'], ['outdated'], '7.0'],
      ['surveillance', 'n', '/səˈveɪləns/', 'Close observation, especially of a suspect or the public.', 'Cities are increasingly covered by surveillance cameras.', ['monitoring', 'observation'], [], '7.5'],
      ['connectivity', 'n', '/ˌkɒnekˈtɪvəti/', 'The state of being connected, especially to the internet.', 'Rural areas still suffer from poor internet connectivity.', ['access', 'linkage'], [], '7.0'],
      ['addictive', 'adj', '/əˈdɪktɪv/', 'Causing a strong, harmful urge to keep doing something.', 'Social media apps are deliberately designed to be addictive.', ['compulsive', 'habit-forming'], [], '6.5'],
      ['disruptive', 'adj', '/dɪsˈrʌptɪv/', 'Radically changing an existing industry or market.', 'Streaming was a disruptive technology that destroyed video rental.', ['revolutionary', 'transformative'], [], '7.5'],
      ['glitch', 'n', '/ɡlɪtʃ/', 'A small, temporary fault in a system.', 'A software glitch briefly took the banking app offline.', ['malfunction', 'bug'], [], '7.0'],
      ['encryption', 'n', '/ɪnˈkrɪpʃn/', 'The process of converting data into a secure code.', 'End-to-end encryption protects messages from eavesdroppers.', ['encoding'], ['decryption'], '8.0'],
      ['streamline', 'v', '/ˈstriːmlaɪn/', 'To make a process simpler and more efficient.', 'The new platform streamlines the entire booking process.', ['simplify', 'optimise'], ['complicate'], '7.5'],
      ['accessible', 'adj', '/əkˈsesəbl/', 'Able to be reached, used or understood easily.', 'Online courses have made higher education far more accessible.', ['available', 'reachable'], ['inaccessible'], '6.5'],
      ['malware', 'n', '/ˈmælweə/', 'Software designed to damage or gain access to a computer.', 'A single click on the link installed malware on the network.', ['virus', 'spyware'], [], '7.0'],
      ['digital divide', 'phrase', '/ˈdɪdʒɪtl dɪˈvaɪd/', 'The gap between those with and without internet access.', 'The pandemic exposed a stark digital divide between rich and poor.', [], [], '7.5'],
      ['user-friendly', 'adj', '/ˈjuːzə ˈfrendli/', 'Easy to use or understand.', 'The interface is clean, intuitive and user-friendly.', ['intuitive', 'accessible'], ['complicated'], '6.5'],
      ['integrate', 'v', '/ˈɪntɪɡreɪt/', 'To combine parts so they work together as a whole.', 'The app integrates seamlessly with your calendar and email.', ['combine', 'merge'], ['separate'], '7.0'],
      ['anonymity', 'n', '/ˌænəˈnɪməti/', 'The state of being unknown or unnamed.', 'Online anonymity can encourage abusive behaviour.', ['namelessness'], ['identity'], '8.0'],
      ['artificial intelligence', 'phrase', '/ˌɑːtɪˈfɪʃl ɪnˈtelɪdʒəns/', 'Computer systems able to perform tasks needing human intelligence.', 'Artificial intelligence is now used to diagnose certain diseases.', ['AI', 'machine learning'], [], '7.0'],
      ['versatile', 'adj', '/ˈvɜːsətaɪl/', 'Able to adapt or be used for many purposes.', 'The device is remarkably versatile, doubling as a camera and phone.', ['adaptable', 'multipurpose'], ['limited'], '7.5'],
      ['data breach', 'phrase', '/ˈdeɪtə briːtʃ/', 'An incident where confidential data is accessed illegally.', 'The data breach exposed millions of customers’ passwords.', ['leak', 'hack'], [], '7.0'],
      ['intuitive', 'adj', '/ɪnˈtjuːɪtɪv/', 'Easy to understand or use without instruction.', 'Good design feels intuitive even to first-time users.', ['instinctive', 'user-friendly'], ['confusing'], '7.5'],
      ['redundant', 'adj', '/rɪˈdʌndənt/', 'No longer needed or useful; superfluous.', 'Automation has made some clerical roles redundant.', ['superfluous', 'unnecessary'], ['essential'], '7.5'],
      ['proliferate', 'v', '/prəˈlɪfəreɪt/', 'To increase rapidly in number.', 'Fake news sites proliferated during the election.', ['multiply', 'mushroom'], ['dwindle'], '8.0'],
      ['seamless', 'adj', '/ˈsiːmləs/', 'Smooth and continuous, with no awkward gaps.', 'The update offers a seamless transition between devices.', ['smooth', 'fluid'], ['disjointed'], '7.5'],
      ['gadget', 'n', '/ˈɡædʒɪt/', 'A small, clever mechanical or electronic device.', 'The shop is full of gadgets that few people actually need.', ['device', 'gizmo'], [], '6.5'],
      ['outdated', 'adj', '/ˌaʊtˈdeɪtɪd/', 'Old-fashioned and no longer useful.', 'Many schools still rely on outdated computer equipment.', ['obsolete', 'antiquated'], ['modern', 'current'], '6.5'],
      ['revolutionise', 'v', '/ˌrevəˈluːʃənaɪz/', 'To change something completely and fundamentally.', 'The smartphone revolutionised the way we communicate.', ['transform', 'overhaul'], [], '7.5'],
      ['screen time', 'phrase', '/ˈskriːn taɪm/', 'Time spent using a device with a screen.', 'Doctors warn that excessive screen time harms children’s sleep.', [], [], '6.5'],
      ['cyberbullying', 'n', '/ˈsaɪbəˌbʊliɪŋ/', 'The use of digital platforms to harass or intimidate.', 'Schools now run workshops to tackle cyberbullying.', ['online harassment'], [], '7.0'],
    ],
  },

  health: {
    title: 'Health & Lifestyle', category: 'topic', color: 'var(--danger)',
    description: 'Diet, fitness, healthcare and well-being — frequent Writing and Speaking themes.',
    words: [
      ['sedentary', 'adj', '/ˈsedntri/', 'Involving little physical activity; spent sitting down.', 'A sedentary lifestyle is linked to obesity and heart disease.', ['inactive', 'desk-bound'], ['active'], '7.5'],
      ['nutritious', 'adj', '/njuˈtrɪʃəs/', 'Containing substances that nourish the body.', 'Children need a balanced, nutritious diet to grow properly.', ['nourishing', 'wholesome'], ['unhealthy'], '6.5'],
      ['epidemic', 'n', '/ˌepɪˈdemɪk/', 'A widespread occurrence of a disease in a community.', 'Health officials struggled to contain the flu epidemic.', ['outbreak', 'plague'], [], '7.0'],
      ['well-being', 'n', '/ˈwel ˈbiːɪŋ/', 'The state of being comfortable, healthy and happy.', 'Employers are paying more attention to staff well-being.', ['welfare', 'wellness'], [], '6.5'],
      ['preventive', 'adj', '/prɪˈventɪv/', 'Designed to stop something, especially illness, before it happens.', 'Preventive medicine reduces the long-term burden on hospitals.', ['precautionary', 'protective'], ['curative'], '7.5'],
      ['chronic', 'adj', '/ˈkrɒnɪk/', 'Persisting for a long time or constantly recurring.', 'Diabetes is a chronic condition requiring lifelong management.', ['persistent', 'long-term'], ['acute', 'temporary'], '7.0'],
      ['obesity', 'n', '/əʊˈbiːsəti/', 'The condition of being extremely overweight.', 'Childhood obesity has tripled over the past generation.', ['excess weight'], [], '6.5'],
      ['immunity', 'n', '/ɪˈmjuːnəti/', 'The body’s ability to resist a particular infection.', 'Vaccination builds immunity against serious diseases.', ['resistance'], ['susceptibility'], '7.0'],
      ['detrimental', 'adj', '/ˌdetrɪˈmentl/', 'Tending to cause harm or damage.', 'Excessive sugar is detrimental to both teeth and waistlines.', ['harmful', 'damaging'], ['beneficial'], '7.5'],
      ['rehabilitation', 'n', '/ˌriːəˌbɪlɪˈteɪʃn/', 'The process of restoring health or normal life after illness.', 'Physiotherapy is central to rehabilitation after surgery.', ['recovery', 'recuperation'], [], '7.5'],
      ['contagious', 'adj', '/kənˈteɪdʒəs/', 'Able to be spread by direct or indirect contact.', 'Measles is highly contagious among unvaccinated children.', ['infectious', 'communicable'], ['non-infectious'], '7.0'],
      ['holistic', 'adj', '/həˈlɪstɪk/', 'Treating the whole person, including mind and lifestyle.', 'The clinic takes a holistic approach to chronic pain.', ['integrated', 'all-round'], ['narrow'], '7.5'],
      ['malnutrition', 'n', '/ˌmælnjuˈtrɪʃn/', 'Poor health caused by an inadequate or unbalanced diet.', 'Millions of children still suffer from malnutrition.', ['undernourishment'], ['nourishment'], '7.5'],
      ['ailment', 'n', '/ˈeɪlmənt/', 'A minor illness or health problem.', 'Common ailments such as colds rarely need antibiotics.', ['illness', 'complaint'], [], '7.0'],
      ['therapeutic', 'adj', '/ˌθerəˈpjuːtɪk/', 'Having a healing or relaxing effect.', 'Gardening can have a genuinely therapeutic effect on the mind.', ['healing', 'restorative'], ['harmful'], '8.0'],
      ['susceptible', 'adj', '/səˈseptəbl/', 'Likely to be affected by something, especially illness.', 'The elderly are particularly susceptible to winter infections.', ['vulnerable', 'prone'], ['resistant', 'immune'], '7.5'],
      ['life expectancy', 'phrase', '/laɪf ɪkˈspektənsi/', 'The average period a person is expected to live.', 'Better healthcare has raised life expectancy worldwide.', [], [], '6.5'],
      ['fatigue', 'n', '/fəˈtiːɡ/', 'Extreme tiredness from exertion or illness.', 'Long shifts leave many nurses suffering from chronic fatigue.', ['exhaustion', 'tiredness'], ['energy'], '7.0'],
      ['abstain', 'v', '/əbˈsteɪn/', 'To choose not to do or consume something.', 'Athletes are advised to abstain from alcohol during training.', ['refrain', 'avoid'], ['indulge'], '8.0'],
      ['outbreak', 'n', '/ˈaʊtbreɪk/', 'The sudden start of something unwelcome, such as disease.', 'An outbreak of cholera followed the floods.', ['epidemic', 'eruption'], [], '7.0'],
      ['balanced diet', 'phrase', '/ˈbælənst ˈdaɪət/', 'A diet containing the right variety and amounts of food.', 'A balanced diet is the foundation of good health.', [], [], '6.5'],
      ['invigorating', 'adj', '/ɪnˈvɪɡəreɪtɪŋ/', 'Making one feel healthy, fresh and energetic.', 'An early morning swim is wonderfully invigorating.', ['refreshing', 'energising'], ['tiring'], '8.0'],
      ['deteriorate', 'v', '/dɪˈtɪəriəreɪt/', 'To become progressively worse.', 'Without treatment, her condition rapidly deteriorated.', ['worsen', 'decline'], ['improve', 'recover'], '7.5'],
      ['hygiene', 'n', '/ˈhaɪdʒiːn/', 'Practices that maintain health and prevent disease.', 'Good hand hygiene dramatically reduces infection rates.', ['cleanliness', 'sanitation'], [], '6.5'],
      ['addiction', 'n', '/əˈdɪkʃn/', 'The condition of being unable to stop using something harmful.', 'Smartphone addiction is a growing concern among teenagers.', ['dependency'], [], '6.5'],
      ['robust', 'adj', '/rəʊˈbʌst/', 'Strong and healthy; not easily damaged.', 'Regular exercise keeps the immune system robust.', ['sturdy', 'vigorous'], ['frail', 'fragile'], '7.5'],
      ['moderation', 'n', '/ˌmɒdəˈreɪʃn/', 'The avoidance of excess; keeping within sensible limits.', 'Most foods are fine when eaten in moderation.', ['restraint', 'temperance'], ['excess'], '7.0'],
      ['ward off', 'phrase', '/wɔːd ɒf/', 'To prevent something harmful from affecting you.', 'A diet rich in fruit may help ward off illness.', ['fend off', 'avert'], [], '7.5'],
      ['longevity', 'n', '/lɒnˈdʒevəti/', 'Long life or duration.', 'Researchers link the population’s longevity to its diet.', ['long life'], [], '8.0'],
    ],
  },

  workEconomy: {
    title: 'Work & Economy', category: 'topic', color: 'var(--warn)',
    description: 'Careers, business and the economy — essential for Task 2 and Part 3 discussion.',
    words: [
      ['unemployment', 'n', '/ˌʌnɪmˈplɔɪmənt/', 'The state of not having a paid job.', 'Rising unemployment puts pressure on welfare systems.', ['joblessness'], ['employment'], '6.5'],
      ['entrepreneur', 'n', '/ˌɒntrəprəˈnɜː/', 'A person who sets up a business, taking financial risks.', 'Young entrepreneurs are reshaping the technology sector.', ['founder', 'businessperson'], [], '7.0'],
      ['recession', 'n', '/rɪˈseʃn/', 'A period of temporary economic decline.', 'Many small firms collapsed during the recession.', ['downturn', 'slump'], ['boom', 'recovery'], '7.0'],
      ['lucrative', 'adj', '/ˈluːkrətɪv/', 'Producing a great deal of profit.', 'Software development remains a highly lucrative career.', ['profitable', 'well-paid'], ['unprofitable'], '7.5'],
      ['workforce', 'n', '/ˈwɜːkfɔːs/', 'The people available for or engaged in work.', 'Automation is transforming the skills the workforce needs.', ['labour force', 'staff'], [], '6.5'],
      ['incentive', 'n', '/ɪnˈsentɪv/', 'Something that motivates or encourages action.', 'Tax breaks act as an incentive for firms to invest.', ['motivation', 'inducement'], ['deterrent'], '7.5'],
      ['redundancy', 'n', '/rɪˈdʌndənsi/', 'The loss of a job because it is no longer needed.', 'The factory closure led to hundreds of redundancies.', ['layoff', 'dismissal'], [], '7.5'],
      ['productivity', 'n', '/ˌprɒdʌkˈtɪvəti/', 'The rate at which goods or work are produced.', 'Flexible hours can actually boost productivity.', ['efficiency', 'output'], [], '7.0'],
      ['remuneration', 'n', '/rɪˌmjuːnəˈreɪʃn/', 'Payment or compensation for work or services.', 'The role offers generous remuneration and benefits.', ['pay', 'salary'], [], '8.0'],
      ['outsource', 'v', '/ˈaʊtsɔːs/', 'To pay an outside company to do work internally done.', 'Many firms outsource customer service to cut costs.', ['contract out', 'subcontract'], ['insource'], '7.5'],
      ['stagnant', 'adj', '/ˈstæɡnənt/', 'Not growing, developing or progressing.', 'Wages have remained stagnant despite rising prices.', ['static', 'flat'], ['booming', 'growing'], '7.5'],
      ['recruitment', 'n', '/rɪˈkruːtmənt/', 'The process of finding and hiring new staff.', 'The company has frozen recruitment until next year.', ['hiring'], [], '6.5'],
      ['monopoly', 'n', '/məˈnɒpəli/', 'Exclusive control of a market by one supplier.', 'Regulators worry that the merger could create a monopoly.', ['domination'], ['competition'], '7.5'],
      ['expertise', 'n', '/ˌekspɜːˈtiːz/', 'Expert skill or knowledge in a particular field.', 'Foreign firms are hired for their technical expertise.', ['proficiency', 'know-how'], ['inexperience'], '7.0'],
      ['fluctuate', 'v', '/ˈflʌktʃueɪt/', 'To rise and fall irregularly.', 'Oil prices fluctuate in response to global events.', ['vary', 'oscillate'], ['stabilise'], '7.5'],
      ['self-employed', 'adj', '/ˌself ɪmˈplɔɪd/', 'Working for oneself rather than an employer.', 'The number of self-employed workers has surged online.', ['freelance', 'independent'], ['salaried'], '6.5'],
      ['subsidy', 'n', '/ˈsʌbsədi/', 'Money paid by a government to support an industry.', 'Farmers depend on subsidies to stay in business.', ['grant', 'support'], [], '7.5'],
      ['thrive', 'v', '/θraɪv/', 'To grow, develop or be successful.', 'Small businesses thrive when red tape is reduced.', ['flourish', 'prosper'], ['struggle', 'fail'], '7.0'],
      ['affluent', 'adj', '/ˈæfluənt/', 'Having a great deal of money; wealthy.', 'The policy mainly benefits the most affluent households.', ['wealthy', 'prosperous'], ['poor', 'deprived'], '7.5'],
      ['workload', 'n', '/ˈwɜːkləʊd/', 'The amount of work to be done by someone.', 'An unmanageable workload often leads to burnout.', ['burden'], [], '6.5'],
      ['vacancy', 'n', '/ˈveɪkənsi/', 'A job position that is available.', 'The firm advertised several vacancies in marketing.', ['opening', 'position'], [], '6.5'],
      ['inflation', 'n', '/ɪnˈfleɪʃn/', 'A general rise in prices and fall in money’s value.', 'Soaring inflation has eroded household savings.', ['price rise'], ['deflation'], '7.0'],
      ['diligent', 'adj', '/ˈdɪlɪdʒənt/', 'Showing careful and persistent effort in work.', 'She earned promotion through diligent, consistent work.', ['hardworking', 'conscientious'], ['lazy', 'negligent'], '7.5'],
      ['startup', 'n', '/ˈstɑːtʌp/', 'A newly established business, often in technology.', 'The city has become a magnet for tech startups.', ['new venture'], [], '6.5'],
      ['burnout', 'n', '/ˈbɜːnaʊt/', 'Physical or mental collapse from overwork.', 'Long hours and constant pressure caused widespread burnout.', ['exhaustion'], [], '7.0'],
      ['feasible', 'adj', '/ˈfiːzəbl/', 'Possible to do easily or conveniently.', 'A four-day week is feasible for many office jobs.', ['viable', 'practical'], ['impractical'], '7.5'],
      ['prosperity', 'n', '/prɒsˈperəti/', 'The state of being successful, especially financially.', 'Trade brought decades of prosperity to the region.', ['wealth', 'affluence'], ['poverty', 'hardship'], '7.0'],
      ['meticulous', 'adj', '/məˈtɪkjələs/', 'Showing great attention to detail; very careful.', 'Accountants must be meticulous about every figure.', ['thorough', 'precise'], ['careless', 'sloppy'], '8.0'],
      ['exploit', 'v', '/ɪkˈsplɔɪt/', 'To use unfairly for one’s own advantage.', 'Some employers exploit migrant workers with low pay.', ['take advantage of', 'misuse'], ['respect'], '7.5'],
    ],
  },

  crimeLaw: {
    title: 'Crime & Law', category: 'topic', color: '#475569',
    description: 'Justice, punishment and policing — a classic Writing Task 2 and Part 3 topic.',
    words: [
      ['deterrent', 'n', '/dɪˈterənt/', 'Something that discourages an action, especially crime.', 'Many doubt that prison is an effective deterrent.', ['discouragement'], ['incentive'], '7.0'],
      ['rehabilitate', 'v', '/ˌriːəˈbɪlɪteɪt/', 'To help an offender return to a normal, law-abiding life.', 'Prisons should aim to rehabilitate, not merely punish.', ['reform', 'reintegrate'], ['punish'], '7.5'],
      ['offender', 'n', '/əˈfendə/', 'A person who commits a crime.', 'First-time offenders are often given community service.', ['criminal', 'culprit'], ['victim'], '6.5'],
      ['lenient', 'adj', '/ˈliːniənt/', 'More merciful or tolerant than expected.', 'Critics say the sentence was far too lenient.', ['merciful', 'soft'], ['harsh', 'severe'], '7.5'],
      ['surveillance', 'n', '/səˈveɪləns/', 'Close watch kept over someone or somewhere.', 'CCTV surveillance has expanded into residential streets.', ['monitoring'], [], '7.5'],
      ['prosecute', 'v', '/ˈprɒsɪkjuːt/', 'To formally charge and try someone for a crime.', 'The company was prosecuted for dumping toxic waste.', ['charge', 'indict'], ['defend'], '7.0'],
      ['corruption', 'n', '/kəˈrʌpʃn/', 'Dishonest or illegal behaviour by those in power.', 'Widespread corruption undermines public trust in government.', ['bribery', 'dishonesty'], ['integrity'], '7.0'],
      ['vandalism', 'n', '/ˈvændəlɪzəm/', 'Deliberate destruction of or damage to property.', 'Vandalism costs the city millions in repairs each year.', ['destruction'], [], '6.5'],
      ['incarceration', 'n', '/ɪnˌkɑːsəˈreɪʃn/', 'The state of being confined in prison.', 'Long incarceration rarely reduces reoffending.', ['imprisonment', 'detention'], ['release', 'freedom'], '8.0'],
      ['felony', 'n', '/ˈfeləni/', 'A serious crime, more grave than a misdemeanour.', 'Armed robbery is classified as a felony.', ['serious crime'], ['misdemeanour'], '7.5'],
      ['enforce', 'v', '/ɪnˈfɔːs/', 'To make sure a law or rule is obeyed.', 'Police struggle to enforce the speed limit in rural areas.', ['impose', 'implement'], ['neglect'], '6.5'],
      ['acquit', 'v', '/əˈkwɪt/', 'To formally declare someone not guilty.', 'The jury acquitted him for lack of evidence.', ['clear', 'exonerate'], ['convict'], '8.0'],
      ['delinquency', 'n', '/dɪˈlɪŋkwənsi/', 'Minor crime, especially by young people.', 'Youth clubs can reduce juvenile delinquency.', ['misconduct', 'wrongdoing'], [], '8.0'],
      ['witness', 'n', '/ˈwɪtnəs/', 'A person who sees an event and can describe it.', 'A key witness changed her account in court.', ['observer', 'bystander'], [], '6.5'],
      ['custody', 'n', '/ˈkʌstədi/', 'Imprisonment or protective care, especially before trial.', 'The suspect was held in custody overnight.', ['detention'], ['release'], '7.0'],
      ['perpetrator', 'n', '/ˈpɜːpətreɪtə/', 'A person who carries out a harmful or illegal act.', 'The perpetrators of the fraud were never caught.', ['offender', 'culprit'], ['victim'], '7.5'],
      ['legislation', 'n', '/ˌledʒɪsˈleɪʃn/', 'Laws considered collectively.', 'New legislation cracks down on online piracy.', ['law', 'statute'], [], '7.0'],
      ['punitive', 'adj', '/ˈpjuːnətɪv/', 'Intended as punishment.', 'Punitive measures alone seldom change behaviour.', ['penal', 'disciplinary'], ['rehabilitative'], '8.0'],
      ['fraud', 'n', '/frɔːd/', 'Criminal deception for financial gain.', 'Online fraud has risen sharply in recent years.', ['deception', 'scam'], ['honesty'], '6.5'],
      ['parole', 'n', '/pəˈrəʊl/', 'The early release of a prisoner under conditions.', 'He was released on parole after serving half his sentence.', ['conditional release'], [], '7.5'],
      ['liable', 'adj', '/ˈlaɪəbl/', 'Legally responsible for something.', 'Companies are liable for accidents caused by negligence.', ['responsible', 'accountable'], ['exempt'], '7.5'],
      ['abolish', 'v', '/əˈbɒlɪʃ/', 'To formally end a law, system or practice.', 'Many countries have abolished capital punishment.', ['scrap', 'repeal'], ['establish', 'introduce'], '7.0'],
      ['testimony', 'n', '/ˈtestɪməni/', 'A formal statement given in court.', 'Her testimony proved decisive at the trial.', ['evidence', 'statement'], [], '7.5'],
      ['crackdown', 'n', '/ˈkrækdaʊn/', 'Severe action taken to control or stop something.', 'The government launched a crackdown on tax evasion.', ['clampdown', 'suppression'], [], '7.0'],
      ['miscarriage of justice', 'phrase', '/mɪsˈkærɪdʒ əv ˈdʒʌstɪs/', 'A failure of a court to deliver a just outcome.', 'New DNA evidence revealed a shocking miscarriage of justice.', [], [], '8.0'],
      ['curb', 'v', '/kɜːb/', 'To restrain or keep something under control.', 'Tougher laws are needed to curb knife crime.', ['restrain', 'check'], ['encourage'], '7.5'],
      ['negligence', 'n', '/ˈneɡlɪdʒəns/', 'Failure to take proper care, causing harm.', 'The hospital was sued for medical negligence.', ['carelessness'], ['diligence'], '7.5'],
      ['law-abiding', 'adj', '/ˈlɔː əˌbaɪdɪŋ/', 'Obeying the law; respectable.', 'Most citizens are peaceful and law-abiding.', ['orderly', 'compliant'], ['criminal'], '7.0'],
      ['impunity', 'n', '/ɪmˈpjuːnəti/', 'Freedom from punishment or consequences.', 'Powerful figures seemed to act with complete impunity.', ['immunity'], ['accountability'], '8.5'],
    ],
  },

  societyCulture: {
    title: 'Society & Culture', category: 'topic', color: '#0d9488',
    description: 'Tradition, diversity and social change — high-value for Writing and Speaking.',
    words: [
      ['multicultural', 'adj', '/ˌmʌltiˈkʌltʃərəl/', 'Relating to several cultural groups within a society.', 'Modern cities are increasingly multicultural.', ['diverse', 'cosmopolitan'], ['homogeneous'], '7.0'],
      ['heritage', 'n', '/ˈherɪtɪdʒ/', 'Traditions and culture passed down through generations.', 'The festival celebrates the country’s rich cultural heritage.', ['legacy', 'tradition'], [], '6.5'],
      ['integration', 'n', '/ˌɪntɪˈɡreɪʃn/', 'The process of mixing into a wider society.', 'Language classes aid the integration of newcomers.', ['assimilation', 'inclusion'], ['segregation'], '7.5'],
      ['norm', 'n', '/nɔːm/', 'An accepted standard of behaviour in a society.', 'Social norms vary enormously from culture to culture.', ['convention', 'standard'], ['deviation'], '7.0'],
      ['prejudice', 'n', '/ˈpredʒədɪs/', 'An unfair opinion formed without good reason.', 'Education is a powerful weapon against prejudice.', ['bias', 'bigotry'], ['tolerance', 'fairness'], '7.0'],
      ['cohesion', 'n', '/kəʊˈhiːʒn/', 'The state of forming a united, integrated whole.', 'Shared values strengthen social cohesion.', ['unity', 'solidarity'], ['division'], '7.5'],
      ['assimilate', 'v', '/əˈsɪməleɪt/', 'To absorb and integrate into a group or culture.', 'Second-generation immigrants often assimilate quickly.', ['integrate', 'absorb'], ['alienate'], '8.0'],
      ['stereotype', 'n', '/ˈsteriətaɪp/', 'A fixed, oversimplified idea about a group.', 'The film challenges tired national stereotypes.', ['cliché', 'generalisation'], [], '7.0'],
      ['marginalised', 'adj', '/ˈmɑːdʒɪnəlaɪzd/', 'Treated as insignificant or pushed to the edge of society.', 'Policies often overlook the most marginalised groups.', ['excluded', 'sidelined'], ['included'], '8.0'],
      ['diversity', 'n', '/daɪˈvɜːsəti/', 'The state of being varied, especially of people.', 'Workplace diversity brings a wider range of ideas.', ['variety', 'plurality'], ['uniformity'], '6.5'],
      ['custom', 'n', '/ˈkʌstəm/', 'A traditional and widely accepted way of behaving.', 'Removing your shoes indoors is a long-standing custom there.', ['tradition', 'practice'], [], '6.5'],
      ['conform', 'v', '/kənˈfɔːm/', 'To behave according to socially accepted standards.', 'Teenagers often feel pressure to conform to their peers.', ['comply', 'fit in'], ['rebel', 'deviate'], '7.0'],
      ['inequality', 'n', '/ˌɪnɪˈkwɒləti/', 'An unfair difference in status or opportunity.', 'Income inequality has widened over recent decades.', ['disparity', 'imbalance'], ['equality'], '7.0'],
      ['tolerance', 'n', '/ˈtɒlərəns/', 'Willingness to accept opinions or behaviour unlike one’s own.', 'A healthy democracy depends on mutual tolerance.', ['acceptance', 'open-mindedness'], ['intolerance'], '6.5'],
      ['indigenous', 'adj', '/ɪnˈdɪdʒənəs/', 'Originating naturally in a particular place; native.', 'Indigenous communities hold deep ecological knowledge.', ['native', 'aboriginal'], ['foreign'], '7.5'],
      ['ethnic', 'adj', '/ˈeθnɪk/', 'Relating to a group with a shared cultural tradition.', 'The country is home to dozens of ethnic minorities.', ['cultural'], [], '6.5'],
      ['secular', 'adj', '/ˈsekjələ/', 'Not connected with religion or spiritual matters.', 'France maintains a strictly secular education system.', ['non-religious'], ['religious'], '8.0'],
      ['solidarity', 'n', '/ˌsɒlɪˈdærəti/', 'Unity arising from shared interests or feelings.', 'Workers marched in solidarity with the strikers.', ['unity', 'togetherness'], ['discord'], '7.5'],
      ['demographic', 'n', '/ˌdeməˈɡræfɪk/', 'A particular section of a population.', 'The product appeals to a younger demographic.', ['population group'], [], '7.5'],
      ['taboo', 'n', '/təˈbuː/', 'A social or cultural prohibition on a topic or behaviour.', 'Discussing salaries remains a taboo in many cultures.', ['prohibition', 'ban'], [], '7.5'],
      ['urbanisation', 'n', '/ˌɜːbənaɪˈzeɪʃn/', 'The increase in the proportion of people living in cities.', 'Rapid urbanisation has strained public services.', ['city growth'], [], '7.0'],
      ['cohort', 'n', '/ˈkəʊhɔːt/', 'A group of people sharing a characteristic, often age.', 'This cohort grew up entirely with the internet.', ['generation', 'group'], [], '8.0'],
      ['altruism', 'n', '/ˈæltruɪzəm/', 'Selfless concern for the welfare of others.', 'Volunteering is often driven by genuine altruism.', ['selflessness', 'generosity'], ['selfishness'], '8.5'],
      ['conservative', 'adj', '/kənˈsɜːvətɪv/', 'Reluctant to change; favouring tradition.', 'Older generations tend to hold more conservative views.', ['traditional', 'cautious'], ['progressive', 'liberal'], '7.0'],
      ['erode', 'v', '/ɪˈrəʊd/', 'To gradually destroy or weaken something.', 'Globalisation can erode local traditions.', ['weaken', 'undermine'], ['strengthen'], '7.5'],
      ['privileged', 'adj', '/ˈprɪvəlɪdʒd/', 'Having special advantages because of wealth or status.', 'Only a privileged few could afford university then.', ['advantaged', 'fortunate'], ['disadvantaged'], '7.0'],
      ['communal', 'adj', '/kəˈmjuːnl/', 'Shared by all members of a community.', 'The village shares a communal water supply.', ['shared', 'collective'], ['private', 'individual'], '7.5'],
      ['generation gap', 'phrase', '/ˌdʒenəˈreɪʃn ɡæp/', 'A difference in attitudes between younger and older people.', 'Technology has widened the generation gap in some families.', [], [], '6.5'],
      ['discrimination', 'n', '/dɪˌskrɪmɪˈneɪʃn/', 'Unfair treatment based on category such as race or sex.', 'Laws now prohibit discrimination in the workplace.', ['bias', 'prejudice'], ['equality', 'fairness'], '7.0'],
    ],
  },

  government: {
    title: 'Government & Globalisation', category: 'topic', color: '#2563eb',
    description: 'Politics, policy and global affairs — advanced vocabulary for Task 2 essays.',
    words: [
      ['policy', 'n', '/ˈpɒləsi/', 'A course of action adopted by a government or organisation.', 'The new policy aims to cut child poverty in half.', ['strategy', 'plan'], [], '6.5'],
      ['globalisation', 'n', '/ˌɡləʊbəlaɪˈzeɪʃn/', 'The process by which the world becomes more interconnected.', 'Globalisation has reshaped both trade and culture.', ['internationalisation'], ['isolationism'], '7.0'],
      ['democracy', 'n', '/dɪˈmɒkrəsi/', 'A system of government by the whole population through voting.', 'A free press is essential to a healthy democracy.', ['self-government'], ['dictatorship'], '6.5'],
      ['sovereignty', 'n', '/ˈsɒvrənti/', 'A nation’s authority to govern itself.', 'Some fear that trade deals erode national sovereignty.', ['autonomy', 'independence'], ['dependence'], '8.0'],
      ['legislation', 'n', '/ˌledʒɪsˈleɪʃn/', 'Laws collectively, or the process of making them.', 'Environmental legislation has tightened considerably.', ['law', 'statute'], [], '7.0'],
      ['bureaucracy', 'n', '/bjʊəˈrɒkrəsi/', 'Complex administrative procedures and officials.', 'Excessive bureaucracy slows down even simple decisions.', ['red tape', 'administration'], [], '7.5'],
      ['diplomacy', 'n', '/dɪˈpləʊməsi/', 'Managing international relations through negotiation.', 'The crisis was resolved through patient diplomacy.', ['negotiation', 'tact'], ['hostility'], '7.5'],
      ['accountability', 'n', '/əˌkaʊntəˈbɪləti/', 'The obligation to explain and take responsibility for actions.', 'Voters demand greater accountability from politicians.', ['responsibility', 'answerability'], ['impunity'], '7.5'],
      ['autonomy', 'n', '/ɔːˈtɒnəmi/', 'The right or condition of self-government.', 'The region was granted greater political autonomy.', ['independence', 'self-rule'], ['dependence'], '8.0'],
      ['referendum', 'n', '/ˌrefəˈrendəm/', 'A direct public vote on a single political question.', 'The constitution was changed by national referendum.', ['public vote', 'plebiscite'], [], '7.5'],
      ['regulate', 'v', '/ˈreɡjuleɪt/', 'To control an activity by means of rules.', 'Governments are racing to regulate artificial intelligence.', ['control', 'govern'], ['deregulate'], '7.0'],
      ['welfare', 'n', '/ˈwelfeə/', 'Government support for those in need; well-being.', 'The welfare system protects the most vulnerable citizens.', ['benefits', 'social security'], [], '6.5'],
      ['propaganda', 'n', '/ˌprɒpəˈɡændə/', 'Biased information used to promote a political cause.', 'State media flooded the country with propaganda.', ['misinformation', 'spin'], [], '7.5'],
      ['advocate', 'v', '/ˈædvəkeɪt/', 'To publicly support or recommend something.', 'Many economists advocate higher taxes on carbon.', ['support', 'champion'], ['oppose'], '7.5'],
      ['interdependence', 'n', '/ˌɪntədɪˈpendəns/', 'A state of mutual reliance between parties.', 'Global trade has created deep economic interdependence.', ['mutual reliance'], ['independence'], '8.0'],
      ['austerity', 'n', '/ɔːˈsterəti/', 'Severe government measures to reduce spending.', 'Years of austerity left public services underfunded.', ['cutbacks', 'belt-tightening'], ['stimulus'], '8.0'],
      ['transparency', 'n', '/trænsˈpærənsi/', 'Openness and honesty in conducting affairs.', 'Citizens are calling for greater transparency in spending.', ['openness', 'candour'], ['secrecy'], '7.5'],
      ['sanction', 'n', '/ˈsæŋkʃn/', 'A penalty, often economic, imposed on a country.', 'International sanctions crippled the regime’s economy.', ['penalty', 'embargo'], ['reward'], '7.5'],
      ['governance', 'n', '/ˈɡʌvənəns/', 'The way in which an organisation or country is run.', 'Good governance attracts foreign investment.', ['administration', 'management'], [], '8.0'],
      ['centralised', 'adj', '/ˈsentrəlaɪzd/', 'Controlled by a single central authority.', 'A heavily centralised system can ignore local needs.', ['concentrated'], ['decentralised'], '7.5'],
      ['mandate', 'n', '/ˈmændeɪt/', 'Authority to act, granted by an electorate.', 'The party claimed a clear mandate for reform.', ['authority', 'authorisation'], [], '8.0'],
      ['repression', 'n', '/rɪˈpreʃn/', 'The use of force to control or subdue people.', 'The protests were met with brutal repression.', ['oppression', 'suppression'], ['freedom'], '7.5'],
      ['migration', 'n', '/maɪˈɡreɪʃn/', 'The movement of people from one place to another.', 'Economic migration reshapes both home and host countries.', ['movement', 'relocation'], [], '6.5'],
      ['coalition', 'n', '/ˌkəʊəˈlɪʃn/', 'A temporary alliance, especially of political parties.', 'A fragile coalition formed after the election.', ['alliance', 'partnership'], [], '7.5'],
      ['infrastructure', 'n', '/ˈɪnfrəstrʌktʃə/', 'Basic physical systems such as roads and power.', 'Investment in infrastructure boosts long-term growth.', ['facilities', 'framework'], [], '7.0'],
      ['exploitation', 'n', '/ˌeksplɔɪˈteɪʃn/', 'Unfair use of people or resources for profit.', 'Critics highlight the exploitation of cheap overseas labour.', ['abuse', 'misuse'], ['fair treatment'], '7.5'],
      ['stability', 'n', '/stəˈbɪləti/', 'The state of being steady and not likely to change.', 'Political stability is vital for economic confidence.', ['steadiness', 'security'], ['instability'], '6.5'],
      ['protectionism', 'n', '/prəˈtekʃənɪzəm/', 'Shielding domestic industries through trade barriers.', 'Rising protectionism threatens global supply chains.', ['trade barriers'], ['free trade'], '8.5'],
      ['unify', 'v', '/ˈjuːnɪfaɪ/', 'To bring together to form a single unit.', 'A common currency was meant to unify the continent.', ['unite', 'merge'], ['divide'], '7.0'],
    ],
  },

  media: {
    title: 'Media & Advertising', category: 'topic', color: '#db2777',
    description: 'News, social media and advertising — increasingly common across IELTS topics.',
    words: [
      ['influential', 'adj', '/ˌɪnfluˈenʃl/', 'Having great influence on people or events.', 'Social media stars are now hugely influential among teenagers.', ['powerful', 'persuasive'], ['insignificant'], '7.0'],
      ['sensationalism', 'n', '/senˈseɪʃənəlɪzəm/', 'Presenting news in a shocking way to attract attention.', 'Tabloid sensationalism distorts public understanding.', ['exaggeration'], ['restraint'], '8.0'],
      ['bias', 'n', '/ˈbaɪəs/', 'A tendency to favour one side unfairly.', 'Readers should be alert to political bias in reporting.', ['partiality', 'slant'], ['objectivity'], '7.0'],
      ['coverage', 'n', '/ˈkʌvərɪdʒ/', 'The reporting of an event by the media.', 'The election received round-the-clock news coverage.', ['reporting'], [], '6.5'],
      ['manipulate', 'v', '/məˈnɪpjuleɪt/', 'To control or influence cleverly or unfairly.', 'Advertisers manipulate emotions to sell products.', ['exploit', 'influence'], [], '7.5'],
      ['credible', 'adj', '/ˈkredəbl/', 'Able to be believed; convincing.', 'Always check whether a source is genuinely credible.', ['believable', 'reliable'], ['dubious'], '7.0'],
      ['misinformation', 'n', '/ˌmɪsɪnfəˈmeɪʃn/', 'False or inaccurate information, especially online.', 'Misinformation spreads faster than verified facts.', ['falsehood', 'fake news'], ['truth'], '7.5'],
      ['endorse', 'v', '/ɪnˈdɔːs/', 'To publicly declare approval or support, especially in ads.', 'Celebrities are paid to endorse beauty products.', ['back', 'promote'], ['condemn'], '7.5'],
      ['saturation', 'n', '/ˌsætʃəˈreɪʃn/', 'The point at which no more can be absorbed; oversupply.', 'Advertising saturation makes consumers tune out.', ['glut', 'overload'], [], '8.0'],
      ['objective', 'adj', '/əbˈdʒektɪv/', 'Not influenced by personal feelings; unbiased.', 'Good journalism strives to be objective.', ['impartial', 'neutral'], ['biased', 'subjective'], '7.0'],
      ['persuasive', 'adj', '/pəˈsweɪsɪv/', 'Good at making people believe or do something.', 'The campaign’s persuasive imagery boosted sales.', ['convincing', 'compelling'], ['unconvincing'], '7.0'],
      ['scrutiny', 'n', '/ˈskruːtəni/', 'Close, critical examination.', 'Public figures live under constant media scrutiny.', ['examination', 'inspection'], [], '7.5'],
      ['censorship', 'n', '/ˈsensəʃɪp/', 'The suppression of speech or media content.', 'Internet censorship limits access to independent news.', ['suppression', 'restriction'], ['free speech'], '7.5'],
      ['advertisement', 'n', '/ədˈvɜːtɪsmənt/', 'A notice or film promoting a product or service.', 'Children are exposed to thousands of advertisements a year.', ['advert', 'commercial'], [], '6.5'],
      ['exposure', 'n', '/ɪkˈspəʊʒə/', 'The state of being seen or experienced widely.', 'Online platforms give small brands global exposure.', ['publicity', 'visibility'], [], '7.0'],
      ['superficial', 'adj', '/ˌsuːpəˈfɪʃl/', 'Shallow; lacking depth or thoroughness.', 'Rolling news often gives only superficial analysis.', ['shallow', 'cursory'], ['profound', 'thorough'], '7.5'],
      ['viral', 'adj', '/ˈvaɪrəl/', 'Spreading rapidly and widely on the internet.', 'The clip went viral within hours of being posted.', ['widespread'], [], '6.5'],
      ['distort', 'v', '/dɪˈstɔːt/', 'To give a misleading or false account of something.', 'Selective editing can distort what really happened.', ['misrepresent', 'twist'], ['clarify'], '7.5'],
      ['subscription', 'n', '/səbˈskrɪpʃn/', 'An arrangement to receive a service for regular payment.', 'Many newspapers now rely on digital subscriptions.', ['membership'], [], '6.5'],
      ['propagate', 'v', '/ˈprɒpəɡeɪt/', 'To spread and promote an idea widely.', 'Rumours propagate quickly across messaging apps.', ['spread', 'disseminate'], ['suppress'], '8.0'],
      ['tabloid', 'n', '/ˈtæblɔɪd/', 'A popular newspaper focusing on sensational stories.', 'Tabloids prioritise celebrity gossip over hard news.', ['gutter press'], ['broadsheet'], '7.5'],
      ['consumerism', 'n', '/kənˈsjuːmərɪzəm/', 'A preoccupation with buying consumer goods.', 'Advertising fuels a culture of relentless consumerism.', ['materialism'], [], '8.0'],
      ['accurate', 'adj', '/ˈækjərət/', 'Correct in all details; free from error.', 'Reporters have a duty to provide accurate information.', ['precise', 'correct'], ['inaccurate'], '6.5'],
      ['watchdog', 'n', '/ˈwɒtʃdɒɡ/', 'A person or group that monitors others’ conduct.', 'A media watchdog flagged the misleading advert.', ['monitor', 'regulator'], [], '7.5'],
      ['stereotype', 'v', '/ˈsteriətaɪp/', 'To portray a group in a fixed, oversimplified way.', 'Adverts often stereotype men and women in outdated roles.', ['pigeonhole', 'typecast'], [], '7.5'],
      ['hype', 'n', '/haɪp/', 'Intensive promotion that exaggerates importance.', 'The product never lived up to the marketing hype.', ['publicity', 'ballyhoo'], [], '7.0'],
      ['intrusive', 'adj', '/ɪnˈtruːsɪv/', 'Disturbing privacy by entering where unwelcome.', 'Pop-up ads are widely seen as intrusive.', ['invasive', 'obtrusive'], ['unobtrusive'], '7.5'],
      ['disseminate', 'v', '/dɪˈsemɪneɪt/', 'To spread information widely.', 'The internet lets anyone disseminate news instantly.', ['circulate', 'broadcast'], ['withhold'], '8.5'],
      ['target audience', 'phrase', '/ˈtɑːɡɪt ˈɔːdiəns/', 'The specific group a product or message is aimed at.', 'The campaign was tailored to a teenage target audience.', [], [], '6.5'],
    ],
  },

  travel: {
    title: 'Travel & Tourism', category: 'topic', color: '#0891b2',
    description: 'Tourism, transport and travel — handy for Speaking and Task 2 essays.',
    words: [
      ['destination', 'n', '/ˌdestɪˈneɪʃn/', 'The place to which someone is travelling.', 'The island has become a top tourist destination.', ['place', 'resort'], ['origin'], '6.5'],
      ['itinerary', 'n', '/aɪˈtɪnərəri/', 'A planned route or schedule of a journey.', 'Our itinerary packed three cities into five days.', ['schedule', 'route'], [], '7.0'],
      ['ecotourism', 'n', '/ˌiːkəʊˈtʊərɪzəm/', 'Responsible travel to natural areas that protects them.', 'Ecotourism funds the conservation of the rainforest.', ['green tourism'], [], '7.5'],
      ['excursion', 'n', '/ɪkˈskɜːʃn/', 'A short trip, usually for pleasure.', 'The hotel offers daily excursions to nearby ruins.', ['outing', 'day trip'], [], '7.0'],
      ['picturesque', 'adj', '/ˌpɪktʃəˈresk/', 'Visually attractive, especially in a quaint way.', 'We stayed in a picturesque fishing village.', ['scenic', 'charming'], ['ugly', 'drab'], '7.5'],
      ['hospitality', 'n', '/ˌhɒspɪˈtæləti/', 'Friendly, generous treatment of guests.', 'The region is famous for its warm hospitality.', ['friendliness', 'welcome'], ['hostility'], '7.0'],
      ['overcrowded', 'adj', '/ˌəʊvəˈkraʊdɪd/', 'Filled with too many people.', 'Famous landmarks are often unpleasantly overcrowded.', ['congested', 'packed'], ['deserted'], '6.5'],
      ['affordable', 'adj', '/əˈfɔːdəbl/', 'Reasonably priced; within one’s means.', 'Budget airlines have made travel far more affordable.', ['inexpensive', 'reasonable'], ['expensive'], '6.5'],
      ['exotic', 'adj', '/ɪɡˈzɒtɪk/', 'Strikingly unusual or foreign, especially in an exciting way.', 'Travellers increasingly seek out exotic destinations.', ['unusual', 'foreign'], ['familiar', 'ordinary'], '7.0'],
      ['accommodation', 'n', '/əˌkɒməˈdeɪʃn/', 'A place to stay, such as a hotel or rented room.', 'Affordable accommodation is scarce during festivals.', ['lodging', 'housing'], [], '6.5'],
      ['venture', 'v', '/ˈventʃə/', 'To go somewhere despite possible risk.', 'Few tourists venture beyond the main resort.', ['dare', 'set out'], [], '7.5'],
      ['scenic', 'adj', '/ˈsiːnɪk/', 'Providing attractive views of natural scenery.', 'We took the longer but more scenic coastal route.', ['picturesque', 'panoramic'], ['drab'], '7.0'],
      ['cosmopolitan', 'adj', '/ˌkɒzməˈpɒlɪtən/', 'Familiar with and comprising people from many cultures.', 'London is one of the world’s most cosmopolitan cities.', ['multicultural', 'worldly'], ['provincial'], '8.0'],
      ['landmark', 'n', '/ˈlændmɑːk/', 'A famous or easily recognised building or feature.', 'The tower is the city’s most photographed landmark.', ['monument', 'attraction'], [], '6.5'],
      ['off the beaten track', 'phrase', '/ɒf ðə ˈbiːtn træk/', 'In a place far from where people usually go.', 'We prefer villages off the beaten track to busy resorts.', ['remote', 'secluded'], [], '7.5'],
      ['wanderlust', 'n', '/ˈwɒndəlʌst/', 'A strong desire to travel and explore the world.', 'Her wanderlust took her to over forty countries.', ['travel bug'], [], '8.0'],
      ['seasonal', 'adj', '/ˈsiːzənl/', 'Occurring or varying with the seasons.', 'Tourism here is highly seasonal, peaking in summer.', ['periodic'], ['year-round'], '7.0'],
      ['commercialised', 'adj', '/kəˈmɜːʃəlaɪzd/', 'Made too focused on making money, losing authenticity.', 'The once-quiet beach is now heavily commercialised.', ['exploited'], ['unspoilt'], '7.5'],
      ['immerse', 'v', '/ɪˈmɜːs/', 'To involve oneself deeply in an activity or environment.', 'Living abroad lets you immerse yourself in a new culture.', ['engross', 'absorb'], [], '8.0'],
      ['breathtaking', 'adj', '/ˈbreθteɪkɪŋ/', 'Astonishing or awe-inspiring, especially in beauty.', 'The view from the summit was breathtaking.', ['stunning', 'spectacular'], ['unremarkable'], '7.0'],
      ['expedition', 'n', '/ˌekspəˈdɪʃn/', 'A journey undertaken for a particular purpose.', 'They joined an expedition to the polar ice cap.', ['journey', 'voyage'], [], '7.0'],
      ['unspoilt', 'adj', '/ˌʌnˈspɔɪlt/', 'Not changed or damaged; still in a natural state.', 'The coastline remains remarkably unspoilt.', ['pristine', 'untouched'], ['developed', 'spoilt'], '7.5'],
      ['migrate', 'v', '/maɪˈɡreɪt/', 'To move from one region or habitat to another.', 'Some retirees migrate south for the warmer winters.', ['relocate', 'move'], ['stay'], '6.5'],
      ['vibrant', 'adj', '/ˈvaɪbrənt/', 'Full of energy, life and colour.', 'The market is a vibrant hub of local life.', ['lively', 'bustling'], ['dull', 'lifeless'], '7.0'],
      ['authentic', 'adj', '/ɔːˈθentɪk/', 'Genuine; truly representing its origins.', 'Tourists increasingly crave authentic local experiences.', ['genuine', 'real'], ['fake', 'artificial'], '7.0'],
      ['rejuvenate', 'v', '/rɪˈdʒuːvəneɪt/', 'To make someone feel younger and full of energy again.', 'A week by the sea rejuvenated the whole family.', ['refresh', 'revitalise'], ['exhaust'], '8.0'],
      ['remote', 'adj', '/rɪˈməʊt/', 'Far away from towns or other people; isolated.', 'The lodge sits in a remote mountain valley.', ['isolated', 'secluded'], ['accessible', 'central'], '6.5'],
      ['infrastructure', 'n', '/ˈɪnfrəstrʌktʃə/', 'Basic facilities such as transport and utilities.', 'Poor transport infrastructure deters foreign visitors.', ['facilities'], [], '7.0'],
      ['bustling', 'adj', '/ˈbʌslɪŋ/', 'Full of energetic and noisy activity.', 'We wandered through the bustling night market.', ['busy', 'lively'], ['quiet', 'sleepy'], '7.5'],
    ],
  },

  awl: {
    title: 'Academic Word List', category: 'function', color: 'var(--accent)',
    description: 'Core high-frequency words from academic English — the backbone of Task 2 writing.',
    words: [
      ['analyse', 'v', '/ˈænəlaɪz/', 'To examine something in detail to understand it.', 'The essay analyses the causes of urban poverty.', ['examine', 'study'], [], '6.5'],
      ['significant', 'adj', '/sɪɡˈnɪfɪkənt/', 'Large or important enough to have an effect.', 'There has been a significant rise in living costs.', ['considerable', 'notable'], ['negligible', 'minor'], '6.5'],
      ['derive', 'v', '/dɪˈraɪv/', 'To obtain something from a source.', 'Much of our energy is still derived from coal.', ['obtain', 'gain'], [], '7.0'],
      ['establish', 'v', '/ɪˈstæblɪʃ/', 'To set up or prove something firmly.', 'Researchers established a clear link between the two.', ['set up', 'demonstrate'], ['abolish'], '6.5'],
      ['evident', 'adj', '/ˈevɪdənt/', 'Clearly seen or understood; obvious.', 'It is evident that early intervention works best.', ['obvious', 'apparent'], ['unclear'], '7.0'],
      ['factor', 'n', '/ˈfæktə/', 'One element contributing to a result.', 'Cost is the decisive factor for most consumers.', ['element', 'cause'], [], '6.5'],
      ['interpret', 'v', '/ɪnˈtɜːprɪt/', 'To explain the meaning of something.', 'The data can be interpreted in several ways.', ['explain', 'construe'], ['misread'], '7.0'],
      ['principle', 'n', '/ˈprɪnsəpl/', 'A fundamental truth or rule guiding behaviour.', 'The system rests on the principle of fairness.', ['rule', 'tenet'], [], '7.0'],
      ['sufficient', 'adj', '/səˈfɪʃnt/', 'Enough for a particular purpose.', 'There is sufficient evidence to justify the policy.', ['adequate', 'ample'], ['insufficient'], '7.0'],
      ['consequently', 'adv', '/ˈkɒnsɪkwəntli/', 'As a result; therefore.', 'Demand fell and prices consequently dropped.', ['therefore', 'thus'], [], '7.0'],
      ['framework', 'n', '/ˈfreɪmwɜːk/', 'A basic structure underlying a system or idea.', 'The treaty sets out a framework for cooperation.', ['structure', 'system'], [], '7.5'],
      ['hypothesis', 'n', '/haɪˈpɒθəsɪs/', 'A proposed explanation tested by research.', 'The experiment supported the original hypothesis.', ['theory', 'proposition'], [], '7.5'],
      ['phenomenon', 'n', '/fəˈnɒmɪnən/', 'A fact or situation that is observed to exist.', 'Mass migration is a global phenomenon.', ['occurrence', 'event'], [], '7.5'],
      ['criteria', 'n', '/kraɪˈtɪəriə/', 'Standards by which something is judged.', 'Applicants are assessed against strict criteria.', ['standards', 'benchmarks'], [], '7.0'],
      ['substantial', 'adj', '/səbˈstænʃl/', 'Large in amount, size or importance.', 'The charity received a substantial donation.', ['considerable', 'sizeable'], ['minor', 'slight'], '7.5'],
      ['underlying', 'adj', '/ˌʌndəˈlaɪɪŋ/', 'Existing beneath the surface; fundamental.', 'We must tackle the underlying causes of crime.', ['fundamental', 'root'], ['superficial'], '7.5'],
      ['advocate', 'n', '/ˈædvəkət/', 'A person who publicly supports a cause.', 'She is a leading advocate of renewable energy.', ['supporter', 'proponent'], ['opponent'], '7.5'],
      ['contradict', 'v', '/ˌkɒntrəˈdɪkt/', 'To assert the opposite; be inconsistent with.', 'These findings contradict earlier studies.', ['oppose', 'refute'], ['confirm', 'support'], '7.5'],
      ['notion', 'n', '/ˈnəʊʃn/', 'A belief, idea or concept.', 'The notion that money buys happiness is questionable.', ['idea', 'concept'], [], '7.5'],
      ['attribute', 'v', '/əˈtrɪbjuːt/', 'To regard something as caused by a particular thing.', 'Experts attribute the decline to rising costs.', ['credit', 'ascribe'], [], '7.5'],
      ['inevitable', 'adj', '/ɪnˈevɪtəbl/', 'Certain to happen; unavoidable.', 'Some job losses are an inevitable result of automation.', ['unavoidable', 'certain'], ['avoidable'], '7.5'],
      ['comprise', 'v', '/kəmˈpraɪz/', 'To consist of or be made up of.', 'The committee comprises experts from five countries.', ['consist of', 'constitute'], [], '7.5'],
      ['correlation', 'n', '/ˌkɒrəˈleɪʃn/', 'A mutual relationship between two things.', 'There is a strong correlation between income and health.', ['connection', 'link'], [], '8.0'],
      ['enhance', 'v', '/ɪnˈhɑːns/', 'To improve the quality or value of something.', 'Technology can greatly enhance the learning experience.', ['improve', 'boost'], ['diminish', 'weaken'], '7.0'],
      ['implication', 'n', '/ˌɪmplɪˈkeɪʃn/', 'A likely consequence or effect.', 'The ruling has serious implications for privacy.', ['consequence', 'ramification'], [], '7.5'],
      ['validity', 'n', '/vəˈlɪdəti/', 'The quality of being logically sound or legally acceptable.', 'Critics questioned the validity of the survey.', ['soundness', 'legitimacy'], ['invalidity'], '8.0'],
      ['arbitrary', 'adj', '/ˈɑːbɪtrəri/', 'Based on random choice rather than reason.', 'The cut-off age seems entirely arbitrary.', ['random', 'capricious'], ['reasoned', 'systematic'], '8.0'],
      ['paradigm', 'n', '/ˈpærədaɪm/', 'A typical pattern or model of something.', 'Remote work has shifted the paradigm of office life.', ['model', 'pattern'], [], '8.5'],
      ['cumulative', 'adj', '/ˈkjuːmjələtɪv/', 'Increasing by successive additions.', 'The cumulative effect of small savings is huge.', ['accumulating', 'collective'], [], '8.0'],
    ],
  },

  linkers: {
    title: 'Linkers & Cohesion', category: 'function', color: 'var(--warn)',
    description: 'Connectives for sequencing, contrasting and exemplifying — the glue of essays.',
    words: [
      ['furthermore', 'adv', '/ˌfɜːðəˈmɔː/', 'In addition; used to add a supporting point.', 'The plan is costly; furthermore, it may not even work.', ['moreover', 'in addition'], [], '7.0'],
      ['nevertheless', 'adv', '/ˌnevəðəˈles/', 'In spite of what has just been said.', 'The risks are real; nevertheless, the benefits outweigh them.', ['nonetheless', 'even so'], [], '7.5'],
      ['consequently', 'adv', '/ˈkɒnsɪkwəntli/', 'As a result of something just mentioned.', 'Rents rose sharply and, consequently, many families moved.', ['therefore', 'as a result'], [], '7.0'],
      ['conversely', 'adv', '/ˈkɒnvɜːsli/', 'Introducing a statement that reverses the previous one.', 'City life is convenient; conversely, it can be stressful.', ['on the other hand', 'in contrast'], [], '8.0'],
      ['moreover', 'adv', '/mɔːrˈəʊvə/', 'Used to add information that strengthens a point.', 'The drug is expensive; moreover, it has side effects.', ['furthermore', 'besides'], [], '7.0'],
      ['notably', 'adv', '/ˈnəʊtəbli/', 'Used to highlight an important example.', 'Several countries, notably Japan, face ageing populations.', ['particularly', 'especially'], [], '7.5'],
      ['whereas', 'adv', '/weərˈæz/', 'In contrast or comparison with the fact that.', 'The north is industrial, whereas the south is agricultural.', ['while', 'in contrast'], [], '7.0'],
      ['albeit', 'adv', '/ɔːlˈbiːɪt/', 'Although; even though (introducing a concession).', 'The reform succeeded, albeit at considerable cost.', ['although', 'even if'], [], '8.0'],
      ['notwithstanding', 'adv', '/ˌnɒtwɪθˈstændɪŋ/', 'In spite of; nevertheless.', 'Notwithstanding the criticism, the policy continued.', ['despite', 'regardless'], [], '8.5'],
      ['thereby', 'adv', '/ˌðeəˈbaɪ/', 'By that means; as a result of that.', 'Recycling reduces waste, thereby protecting resources.', ['thus', 'in that way'], [], '8.0'],
      ['hence', 'adv', '/hens/', 'For this reason; therefore.', 'The data are incomplete; hence the cautious conclusion.', ['therefore', 'thus'], [], '7.5'],
      ['for instance', 'phrase', '/fər ˈɪnstəns/', 'Used to introduce an example.', 'Many habits, for instance smoking, are hard to break.', ['for example', 'such as'], [], '6.5'],
      ['in addition', 'phrase', '/ɪn əˈdɪʃn/', 'Used to add another point.', 'In addition, the scheme creates thousands of jobs.', ['furthermore', 'also'], [], '6.5'],
      ['on the other hand', 'phrase', '/ɒn ðə ˈʌðə hænd/', 'Used to present a contrasting view.', 'On the other hand, some argue the opposite.', ['conversely', 'however'], [], '6.5'],
      ['as a result', 'phrase', '/əz ə rɪˈzʌlt/', 'Because of something; consequently.', 'Sales fell and, as a result, staff were let go.', ['consequently', 'therefore'], [], '6.5'],
      ['in contrast', 'phrase', '/ɪn ˈkɒntrɑːst/', 'Used to compare two opposing things.', 'In contrast, rural areas have lost population.', ['conversely', 'on the other hand'], [], '7.0'],
      ['to illustrate', 'phrase', '/tu ˈɪləstreɪt/', 'Used to introduce a clarifying example.', 'To illustrate, consider the case of online banking.', ['for example', 'by way of example'], [], '7.5'],
      ['by and large', 'phrase', '/baɪ ən lɑːdʒ/', 'On the whole; generally speaking.', 'By and large, the reforms have been welcomed.', ['generally', 'on the whole'], [], '7.5'],
      ['owing to', 'phrase', '/ˈəʊɪŋ tu/', 'Because of; as a result of.', 'Owing to bad weather, the event was cancelled.', ['due to', 'because of'], [], '7.0'],
      ['in essence', 'phrase', '/ɪn ˈesns/', 'Used to state the most basic point.', 'In essence, the argument boils down to fairness.', ['fundamentally', 'basically'], [], '7.5'],
      ['all things considered', 'phrase', '/ɔːl θɪŋz kənˈsɪdəd/', 'After taking everything into account.', 'All things considered, the project was a success.', ['on balance', 'overall'], [], '7.5'],
      ['granted that', 'phrase', '/ˈɡrɑːntɪd ðæt/', 'Used to admit a point before countering it.', 'Granted that costs are high, the long-term gains justify them.', ['admittedly', 'while it is true'], [], '8.0'],
      ['in light of', 'phrase', '/ɪn laɪt əv/', 'Taking into account; because of.', 'In light of recent events, the rules were tightened.', ['considering', 'given'], [], '7.5'],
      ['on balance', 'phrase', '/ɒn ˈbæləns/', 'After weighing all the factors.', 'On balance, the advantages outweigh the drawbacks.', ['overall', 'all things considered'], [], '7.5'],
      ['to that end', 'phrase', '/tə ðæt end/', 'For that purpose; in order to achieve that.', 'The city wants cleaner air; to that end, it banned diesel cars.', ['for this reason', 'with this aim'], [], '8.0'],
      ['despite this', 'phrase', '/dɪˈspaɪt ðɪs/', 'In spite of what was just mentioned.', 'The risks were clear; despite this, the plan went ahead.', ['nonetheless', 'even so'], [], '7.0'],
      ['similarly', 'adv', '/ˈsɪmələli/', 'In a comparable way; likewise.', 'Cars pollute cities; similarly, factories foul rivers.', ['likewise', 'in the same way'], [], '7.0'],
      ['ultimately', 'adv', '/ˈʌltɪmətli/', 'In the end; finally, after all considerations.', 'Ultimately, the decision rests with voters.', ['eventually', 'in the end'], [], '7.0'],
      ['arguably', 'adv', '/ˈɑːɡjuəbli/', 'As can be argued or shown by reasoning.', 'It is arguably the most pressing issue of our age.', ['possibly', 'conceivably'], [], '7.5'],
    ],
  },

  collocations: {
    title: 'High-band Collocations', category: 'function', color: 'var(--info)',
    description: 'Natural word partnerships that examiners reward — ready-made for essays.',
    words: [
      ['pose a threat', 'phrase', '', 'To be a danger to someone or something.', 'Rising sea levels pose a serious threat to coastal cities.', ['endanger', 'jeopardise'], [], '7.0'],
      ['play a pivotal role', 'phrase', '', 'To be extremely important in a process or outcome.', 'Education plays a pivotal role in reducing poverty.', ['be crucial', 'be central'], [], '7.5'],
      ['a vested interest', 'phrase', '', 'A personal stake in something, often financial.', 'Oil firms have a vested interest in delaying reform.', ['a stake', 'self-interest'], [], '8.0'],
      ['bridge the gap', 'phrase', '', 'To reduce or remove a difference between things.', 'Scholarships help bridge the gap between rich and poor students.', ['close the gap'], ['widen the gap'], '7.5'],
      ['a viable alternative', 'phrase', '', 'A realistic and workable option.', 'Solar power is now a viable alternative to coal.', ['a feasible option'], [], '7.5'],
      ['far-reaching consequences', 'phrase', '', 'Effects that are extensive and long-lasting.', 'The decision had far-reaching consequences for the economy.', ['wide-ranging effects'], [], '7.5'],
      ['a contentious issue', 'phrase', '', 'A subject that causes a lot of disagreement.', 'Immigration remains a contentious issue in many countries.', ['a divisive topic'], [], '8.0'],
      ['strike a balance', 'phrase', '', 'To find a sensible compromise between two things.', 'Parents must strike a balance between freedom and control.', ['find a compromise'], [], '7.5'],
      ['raise awareness', 'phrase', '', 'To increase public knowledge of an issue.', 'The campaign aims to raise awareness of recycling.', ['highlight', 'publicise'], [], '7.0'],
      ['deep-rooted', 'adj', '/ˌdiːp ˈruːtɪd/', 'Firmly established and hard to change.', 'Many social problems are deep-rooted and complex.', ['ingrained', 'entrenched'], ['superficial'], '7.5'],
      ['widely acknowledged', 'phrase', '', 'Generally accepted or recognised by most people.', 'It is widely acknowledged that exercise improves mood.', ['generally accepted'], ['disputed'], '7.5'],
      ['a pressing concern', 'phrase', '', 'An issue that needs urgent attention.', 'Youth unemployment is a pressing concern for the government.', ['an urgent issue'], [], '7.5'],
      ['gain momentum', 'phrase', '', 'To grow stronger or faster over time.', 'The campaign for cleaner energy is gaining momentum.', ['build up', 'accelerate'], ['lose momentum'], '7.5'],
      ['shed light on', 'phrase', '', 'To make something easier to understand.', 'The study sheds light on why teenagers sleep poorly.', ['clarify', 'illuminate'], ['obscure'], '8.0'],
      ['take its toll', 'phrase', '', 'To cause gradual harm or damage.', 'Long working hours take their toll on family life.', ['have a negative effect'], [], '7.5'],
      ['a double-edged sword', 'phrase', '', 'Something with both good and bad consequences.', 'Tourism is a double-edged sword for fragile regions.', ['a mixed blessing'], [], '8.0'],
      ['address the issue', 'phrase', '', 'To deal with or tackle a problem.', 'Governments must address the issue of plastic waste.', ['tackle', 'confront'], ['ignore'], '7.0'],
      ['a knock-on effect', 'phrase', '', 'A secondary effect caused by an initial event.', 'Fuel price rises have a knock-on effect on food costs.', ['ripple effect', 'chain reaction'], [], '7.5'],
      ['a last resort', 'phrase', '', 'A final option when all else has failed.', 'Surgery is considered only as a last resort.', ['final option'], [], '7.0'],
      ['detrimental impact', 'phrase', '', 'A harmful effect on something.', 'Pollution has a detrimental impact on public health.', ['harmful effect'], ['beneficial impact'], '7.5'],
      ['a sedentary lifestyle', 'phrase', '', 'A way of living with very little physical activity.', 'A sedentary lifestyle contributes to many illnesses.', [], ['an active lifestyle'], '7.5'],
      ['vast majority', 'phrase', '', 'Almost all of a group.', 'The vast majority of commuters favour cleaner transport.', ['overwhelming majority'], ['tiny minority'], '7.0'],
      ['heavily reliant', 'phrase', '', 'Depending very much on something.', 'The economy is heavily reliant on tourism.', ['dependent on'], ['independent of'], '7.5'],
      ['a stark contrast', 'phrase', '', 'A very obvious and striking difference.', 'There is a stark contrast between urban and rural incomes.', ['sharp difference'], ['similarity'], '7.5'],
      ['fall short of', 'phrase', '', 'To fail to reach a required standard.', 'The results fell short of expectations.', ['fail to meet'], ['exceed'], '7.5'],
      ['unprecedented levels', 'phrase', '', 'Amounts never seen or reached before.', 'House prices have reached unprecedented levels.', ['record levels'], [], '8.0'],
      ['curb the rise', 'phrase', '', 'To restrain or limit an increase.', 'New taxes are intended to curb the rise in emissions.', ['limit the increase'], [], '8.0'],
      ['reap the benefits', 'phrase', '', 'To enjoy the rewards of an effort.', 'Students who study consistently reap the benefits later.', ['enjoy the rewards'], [], '7.5'],
      ['a growing tendency', 'phrase', '', 'An increasing inclination toward something.', 'There is a growing tendency to work from home.', ['an increasing trend'], [], '7.5'],
    ],
  },

  speakingIdioms: {
    title: 'Speaking · Part 3 & Idioms', category: 'function', color: 'var(--danger)',
    description: 'Natural phrases and idioms that lift fluency in the Speaking interview.',
    words: [
      ['off the top of my head', 'phrase', '', 'Without taking time to check or think carefully.', 'Off the top of my head, I’d say about ten.', ['without thinking'], [], '7.5'],
      ['in the long run', 'phrase', '', 'Over an extended period in the future.', 'Studying abroad pays off in the long run.', ['eventually', 'ultimately'], ['in the short term'], '7.0'],
      ['a blessing in disguise', 'phrase', '', 'A misfortune that turns out to have benefits.', 'Losing that job was a blessing in disguise.', ['a silver lining'], [], '7.5'],
      ['when it comes to', 'phrase', '', 'Used to introduce a particular topic.', 'When it comes to cooking, I’m pretty hopeless.', ['regarding', 'as for'], [], '6.5'],
      ['more often than not', 'phrase', '', 'Usually; in most cases.', 'More often than not, I walk to work.', ['usually', 'generally'], ['rarely'], '7.0'],
      ['the bigger picture', 'phrase', '', 'The most important facts about a situation.', 'It helps to step back and see the bigger picture.', ['the wider view'], ['the details'], '7.5'],
      ['food for thought', 'phrase', '', 'Something worth thinking about seriously.', 'That documentary really gave me food for thought.', ['something to ponder'], [], '7.5'],
      ['see eye to eye', 'phrase', '', 'To agree completely with someone.', 'My brother and I don’t always see eye to eye.', ['agree'], ['disagree'], '7.5'],
      ['hit the nail on the head', 'phrase', '', 'To describe exactly what is causing a situation.', 'You’ve hit the nail on the head with that point.', ['be exactly right'], [], '8.0'],
      ['a grey area', 'phrase', '', 'A situation where the rules are unclear.', 'Online privacy is still a bit of a grey area.', ['ambiguous area'], [], '7.5'],
      ['to be honest', 'phrase', '', 'Used to introduce a frank opinion.', 'To be honest, I’ve never really enjoyed sport.', ['frankly', 'honestly'], [], '6.5'],
      ['take it for granted', 'phrase', '', 'To assume something without appreciating it.', 'We often take clean water for granted.', ['assume', 'undervalue'], ['appreciate'], '7.5'],
      ['a means to an end', 'phrase', '', 'Something done only to achieve a result, not for itself.', 'For me, the job is just a means to an end.', [], [], '7.5'],
      ['get the hang of', 'phrase', '', 'To learn how to do something with practice.', 'It took me a week to get the hang of the software.', ['master', 'learn'], [], '7.0'],
      ['be torn between', 'phrase', '', 'To be unable to choose between two options.', 'I’m torn between studying medicine and law.', ['be undecided'], [], '7.5'],
      ['without a doubt', 'phrase', '', 'Used to express complete certainty.', 'Without a doubt, it’s the best city I’ve visited.', ['definitely', 'certainly'], [], '7.0'],
      ['broaden your horizons', 'phrase', '', 'To widen the range of your knowledge or experience.', 'Travelling really broadens your horizons.', ['expand your outlook'], [], '8.0'],
      ['have mixed feelings', 'phrase', '', 'To feel both positive and negative about something.', 'I have mixed feelings about social media.', ['be ambivalent'], [], '7.0'],
      ['a far cry from', 'phrase', '', 'Very different from something.', 'City life is a far cry from the village I grew up in.', ['very different from'], [], '8.0'],
      ['can’t stand', 'phrase', '', 'To strongly dislike something.', 'I can’t stand being stuck in traffic.', ['detest', 'loathe'], ['love'], '6.5'],
      ['keep up with', 'phrase', '', 'To stay informed about or level with something.', 'It’s hard to keep up with the latest technology.', ['stay current'], ['fall behind'], '7.0'],
      ['for the most part', 'phrase', '', 'Mostly; in most respects.', 'For the most part, people here are very friendly.', ['mostly', 'largely'], [], '7.0'],
      ['a once-in-a-lifetime opportunity', 'phrase', '', 'A chance that is unlikely to come again.', 'Studying there was a once-in-a-lifetime opportunity.', ['a rare chance'], [], '7.5'],
      ['put it into perspective', 'phrase', '', 'To compare something so its real importance is clear.', 'Travelling abroad put my own problems into perspective.', ['see it clearly'], [], '8.0'],
      ['a double standard', 'phrase', '', 'A rule applied unfairly to different people.', 'There’s a double standard in how the two are judged.', ['unfairness', 'hypocrisy'], [], '8.0'],
      ['second to none', 'phrase', '', 'Better than anything else of the same kind.', 'The country’s public transport is second to none.', ['unrivalled', 'the best'], [], '8.0'],
      ['cut corners', 'phrase', '', 'To do something cheaply or quickly, often poorly.', 'Builders who cut corners put safety at risk.', ['skimp'], [], '7.5'],
      ['the be-all and end-all', 'phrase', '', 'The most important element; the only thing that matters.', 'For some students, grades are the be-all and end-all.', ['the most important thing'], [], '8.5'],
      ['get to grips with', 'phrase', '', 'To begin to understand and deal with something difficult.', 'It took time to get to grips with living alone.', ['come to terms with'], [], '8.0'],
    ],
  },
}

/* ── SQL emit ─────────────────────────────────────────────────────────────── */
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const arr = (a) => (a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`)

const SCHEMA = `-- ============================================================
-- IELTS Vocabulary bank: decks + words (+ per-user SRS progress)
-- Generated by scripts/gen-vocab.mjs — do not edit by hand.
-- ============================================================

create table if not exists vocabulary_decks (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique,
  title        text not null,
  description  text not null,
  category     text not null check (category in ('topic', 'function')),
  color        text not null default 'var(--accent)',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists vocabulary_words (
  id              uuid primary key default uuid_generate_v4(),
  deck_id         uuid not null references vocabulary_decks(id) on delete cascade,
  word            text not null,
  part_of_speech  text not null,
  ipa             text,
  definition      text not null,
  example         text not null,
  synonyms        text[] not null default '{}',
  antonyms        text[] not null default '{}',
  band_level      text not null,
  created_at      timestamptz not null default now(),
  unique (deck_id, word)
);

create table if not exists user_vocabulary (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  word_id        uuid not null references vocabulary_words(id) on delete cascade,
  status         text not null default 'new' check (status in ('new', 'learning', 'learned')),
  ease           numeric(3,2) not null default 2.5,
  interval_days  integer not null default 0,
  repetitions    integer not null default 0,
  due_at         timestamptz not null default now(),
  last_result    text check (last_result in ('again', 'hard', 'good', 'easy')),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, word_id)
);

create index if not exists idx_vocabulary_words_deck on vocabulary_words(deck_id);
create index if not exists idx_user_vocabulary_due   on user_vocabulary(user_id, due_at);

-- ── Row level security ──────────────────────────────────────────────────────
alter table vocabulary_decks enable row level security;
alter table vocabulary_words enable row level security;
alter table user_vocabulary  enable row level security;

drop policy if exists "Anyone can read vocabulary decks" on vocabulary_decks;
create policy "Anyone can read vocabulary decks" on vocabulary_decks for select using (true);

drop policy if exists "Anyone can read vocabulary words" on vocabulary_words;
create policy "Anyone can read vocabulary words" on vocabulary_words for select using (true);

drop policy if exists "Users read own vocab progress"   on user_vocabulary;
drop policy if exists "Users insert own vocab progress" on user_vocabulary;
drop policy if exists "Users update own vocab progress" on user_vocabulary;
create policy "Users read own vocab progress"   on user_vocabulary for select using (auth.uid() = user_id);
create policy "Users insert own vocab progress" on user_vocabulary for insert with check (auth.uid() = user_id);
create policy "Users update own vocab progress" on user_vocabulary for update using (auth.uid() = user_id);
`

function emit() {
  const lines = [SCHEMA, '']
  const slugs = Object.keys(DECKS)

  lines.push('-- ── Decks ───────────────────────────────────────────────────────────────────')
  lines.push('insert into vocabulary_decks (slug, title, description, category, color, sort_order) values')
  lines.push(
    slugs
      .map((slug, i) => {
        const d = DECKS[slug]
        return `  (${q(slug)}, ${q(d.title)}, ${q(d.description)}, ${q(d.category)}, ${q(d.color)}, ${i})`
      })
      .join(',\n') + '\non conflict (slug) do update set\n  title = excluded.title, description = excluded.description,\n  category = excluded.category, color = excluded.color, sort_order = excluded.sort_order;'
  )
  lines.push('')

  let total = 0
  for (const slug of slugs) {
    const d = DECKS[slug]
    lines.push(`-- ── ${d.title} (${d.words.length}) ──`)
    lines.push(
      `insert into vocabulary_words (deck_id, word, part_of_speech, ipa, definition, example, synonyms, antonyms, band_level)\nselect d.id, w.word, w.pos, w.ipa, w.def, w.ex, w.syn, w.ant, w.band\nfrom vocabulary_decks d\ncross join (values`
    )
    lines.push(
      d.words
        .map(
          ([word, pos, ipa, def, ex, syn, ant, band]) =>
            `  (${q(word)}, ${q(pos)}, ${q(ipa)}, ${q(def)}, ${q(ex)}, ${arr(syn)}, ${arr(ant)}, ${q(band)})`
        )
        .join(',\n')
    )
    lines.push(
      `) as w(word, pos, ipa, def, ex, syn, ant, band)\nwhere d.slug = ${q(slug)}\non conflict (deck_id, word) do nothing;`
    )
    lines.push('')
    total += d.words.length
  }

  lines.push(`-- Total words: ${total} across ${slugs.length} decks`)
  const out = lines.join('\n')
  writeFileSync(new URL('../supabase/migrations/010_vocabulary.sql', import.meta.url), out)
  console.log(`Wrote 010_vocabulary.sql — ${total} words, ${slugs.length} decks`)
}

emit()
