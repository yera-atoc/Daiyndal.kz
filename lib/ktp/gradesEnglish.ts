// Сынып бойынша КТП: ағылшын тілі 3–11 (Қараша — Мамыр, 21 мазмұнды апта). Мұғалім: Ернар.
import type { KtpTemplate } from './templates'

const E = (g: number, weeks: string): KtpTemplate => ({
  id: `eng${g}`,
  title: `English · ${g} сынып`,
  subject: 'Ағылшын тілі',
  keys: ['english', 'ағылшын', 'английский'],
  grades: [g, g],
  teacher: 'Ернар',
  weeks,
})

export const ENGLISH: KtpTemplate[] = [
  E(3, `Hello again! Greetings & classroom language; Alphabet and phonics review :: 10 words
My family: family members; Have got / has got :: family tree
My friends: describing people; Adjectives (tall, short, kind) :: 6 sentences
My school: school things; This / that, these / those :: label pictures
Classroom actions; Imperatives (sit down, open your book) :: 8 sentences
Numbers 1–100; How many…? :: 10 sums
Toys and games; Possessive 's :: 6 sentences
Animals: farm and wild; Can / can't :: 6 sentences
My body; Our senses :: label picture
Clothes; Present Continuous: I'm wearing… :: describe a picture
Food and drinks; Like / don't like :: 6 sentences
Fruit and vegetables; Some / any (basic) :: shopping list
My house: rooms and furniture; There is / there are :: my room (6 sentences)
Prepositions: in, on, under, next to; Where is…? :: picture task
Days of the week; My day: daily routines :: picture diary
Telling the time; Present Simple: I get up at… :: 6 sentences
Weather and seasons; Months and birthdays :: weather chart
Sports and hobbies; I can / I like + -ing :: poster
Reading: short stories; Speaking: show and tell :: retell
Review: vocabulary; Review: grammar :: 20-question quiz
Final test; Feedback and summer words :: summer word book`),
  E(4, `Back to school: school subjects; Present Simple (+, −, ?) :: 15 sentences
My timetable; Adverbs of frequency :: my timetable
Daily routines; Telling the time (quarter, half) :: my day (50 words)
Healthy food; Countable / uncountable nouns :: menu
At the shop; How much / how many :: dialogue
Our town: places; Prepositions of place :: town map
Directions; Imperatives: turn left, go straight :: route
Jobs and occupations; Present Continuous :: 8 sentences
Animals and their habitats; Comparatives :: 8 sentences
Weather around the world; Superlatives :: 8 sentences
Free time: hobbies; Like / love / hate + -ing :: 6 sentences
Past Simple: was / were; Yesterday and last weekend :: 8 sentences
Past Simple: regular verbs; Past Simple: questions :: 10 sentences
Past Simple: irregular verbs (1); Irregular verbs (2) :: verb list
Travelling: transport; Going to (plans) :: holiday plan
Space and planets; Can / could :: fact file
Festivals and holidays (Nauryz); Dates and ordinal numbers :: card
Reading: fairy tales; Writing: a short story :: 60 words
Speaking: describing pictures; Listening practice :: recording
Review: vocabulary; Review: tenses :: 30-question quiz
Final test; Feedback :: summer reading`),
  E(5, `Myself: personal information; To be and have got (review) :: profile
My family and relatives; Possessive adjectives and 's :: 8 sentences
Our community: places and people; Present Simple :: 10 sentences
Helping in the community; Present Continuous vs Present Simple :: 10 sentences
Living things: animals; Comparatives and superlatives :: 10 sentences
Plants and nature; There is / there are, some / any :: 8 sentences
Food and drink: recipes; Countable / uncountable, much / many :: recipe
Healthy lifestyle; Should / shouldn't :: 6 tips
Sport: famous athletes; Can / could (ability) :: fact file
Past Simple: famous people; Past Simple questions :: biography (60 words)
Planet Earth: geography words; Articles a / an / the :: 10 sentences
Weather and climate; Will for predictions :: forecast
Holidays and travel; Going to vs will :: holiday plan
Entertainment: films and TV; Adjectives with -ed / -ing :: review
Reading: stories (Kazakh legends); Past Continuous (intro) :: retell
Writing: an informal email; Linking words (and, but, because) :: 80 words
Listening: everyday dialogues; Speaking: role play :: dialogue
Vocabulary: phrasal verbs (get up, look for); Prepositions of time :: 15 items
Mock test (reading + grammar); Analysis :: correction
Review: vocabulary; Review: grammar :: 30-question quiz
Final test; Feedback :: summer reading`),
  E(6, `Hobbies and interests; Present Simple vs Present Continuous :: 12 sentences
Clubs and free-time activities; Stative verbs :: 10 sentences
Transport and travel; Comparatives (as…as, too, enough) :: 10 sentences
Journeys; Past Simple vs Past Continuous :: story (80 words)
Values: friendship and kindness; Must / have to / should :: 8 sentences
Rules at school and home; Mustn't vs don't have to :: rules poster
Space and Earth; Present Perfect (ever / never) :: 10 sentences
Explorers and inventions; Present Perfect vs Past Simple :: 10 sentences
Holidays around the world; Future forms: will / going to :: plan
Food and cooking; Quantifiers (a lot of, a few, a little) :: recipe
Shopping and money; Comparatives and superlatives (review) :: dialogue
Environment: recycling; First Conditional :: 8 sentences
Animals in danger; Passive (Present Simple, intro) :: fact file
Reading: articles; Reading strategies (skimming) :: 1 text
Writing: a description of a place; Adjective order :: 100 words
Listening: interviews; Speaking: giving opinions :: 6 answers
Vocabulary: collocations (make / do); Phrasal verbs :: 15 items
Mock test; Analysis :: correction
Project: My Kazakhstan; Presentations :: poster
Review: tenses; Review: modals and conditionals :: 30-question quiz
Final test; Feedback :: summer reading`),
  E(7, `Entertainment and media; Present tenses review :: 12 sentences
Films and TV genres; Past Simple vs Past Continuous :: review (100 words)
Clothes and fashion; Used to :: 8 sentences
Describing appearance; Relative clauses (who, which, that) :: 10 sentences
Healthy habits; Should / ought to, had better :: advice letter
Sport and fitness; Present Perfect (just, already, yet) :: 10 sentences
The natural world; Present Perfect: for / since :: 10 sentences
Extreme weather; Passive voice (Present / Past) :: 10 sentences
Travel and tourism; Future forms (will, going to, Present Continuous) :: 10 sentences
Holiday problems; First and Second Conditional :: 8 sentences
Technology in our lives; Gerund vs infinitive :: 10 sentences
Communication; Reported speech (statements) :: 8 sentences
Reading: articles and blogs; Inference questions :: 1 text
Writing: an opinion paragraph; Linking words (however, although) :: 120 words
Listening: radio programmes; Note-taking :: 1 recording
Speaking: photo description; Comparing pictures :: record
Vocabulary: word formation (-ful, -less, -ness); Phrasal verbs :: 20 items
Mock test (reading + grammar); Analysis :: correction
Project: famous Kazakhstani people; Presentations :: slides
Review: tenses; Review: passive, conditionals :: 40-question quiz
Final test; Feedback :: summer reading`),
  E(8, `Our world: countries and cultures; Present tenses (review, stative verbs) :: 12 sentences
Traditions; Past Perfect :: 10 sentences
Health and sport; Modals of obligation and advice :: 8 sentences
Medicine and the human body; Zero and First Conditional :: 10 sentences
Technology and inventions; Passive voice (all tenses) :: 12 sentences
Digital life; Reported speech (statements, questions) :: 10 sentences
Natural disasters; Past Continuous and Past Perfect :: story (120 words)
Climate change; Second Conditional, wish :: 10 sentences
Hospitality and food culture; Countable / uncountable, quantifiers :: menu
Jobs and the world of work; Gerund and infinitive :: 10 sentences
Science and discovery; Relative clauses (defining / non-defining) :: 10 sentences
Art and music; Comparatives and superlatives (modifiers) :: review
Reading: magazine articles; Matching headings :: 1 text
Writing: a formal email; Formal vs informal language :: 120 words
Writing: a for-and-against essay; Paragraph structure :: 150 words
Listening: lectures; Speaking: discussions :: 1 recording
Vocabulary: collocations; Prefixes (un-, dis-, im-, re-) :: 20 items
Mock test; Analysis :: correction
Project: environmental campaign; Presentations :: poster
Review: tenses and passive; Review: conditionals and reported speech :: 40-question quiz
Final test; Feedback :: summer reading`),
  E(9, `Education and employment; Present Perfect Continuous :: 10 sentences
Future careers; Future Continuous and Future Perfect :: 10 sentences
Communication and language; Reported speech (commands, requests) :: 10 sentences
Body language; Modals of deduction (must, might, can't) :: 8 sentences
Living things and ecosystems; Passive with modals :: 10 sentences
Endangered species; Causative (have something done) :: 8 sentences
Fiction and literature; Narrative tenses :: story (150 words)
Famous writers (Abai, Shakespeare); Relative clauses (review) :: biography
Cities of the future; Third Conditional :: 8 sentences
Urban problems; Mixed conditionals (intro) :: 8 sentences
Science and technology; Gerunds and infinitives (advanced) :: 10 sentences
Media and news; Reporting verbs (suggest, deny, admit) :: 10 sentences
Reading: True / False / Not Given; Reading: multiple choice :: 1 text
Writing: an opinion essay; Hedging and linking :: 180 words
Writing: a report; Describing data :: 150 words
Listening: interviews and talks; Speaking: long turn (2 minutes) :: record
Vocabulary: word formation; Phrasal verbs and idioms :: 25 items
Mock test (reading, grammar, writing); Analysis :: correction
Project: My future career; Presentations :: slides
Review: tenses and conditionals; Review: passive and reported speech :: 40-question quiz
Final test; Feedback :: summer plan`),
  E(10, `Our space: home and neighbourhood; Tense review (all tenses) :: 15 sentences
Values and society; Modals (past modals: should have, must have) :: 10 sentences
Environment and sustainability; Passive and causative (review) :: 10 sentences
Energy and resources; Conditionals (all types) :: 10 sentences
Science and innovation; Relative clauses and participle clauses :: 10 sentences
Space exploration; Future in the past :: 8 sentences
Culture and art; Inversion (intro: never, rarely) :: 8 sentences
Travel and cultural differences; Articles (advanced) :: 15 sentences
Health and wellbeing; Reported speech (review) :: 10 sentences
Education systems; Wish / if only :: 8 sentences
Reading: academic texts; Matching headings, summary completion :: 1 text
Listening: academic lectures; Note completion :: 1 recording
Writing: a discussion essay (IELTS Task 2 style); Coherence and cohesion :: 200 words
Writing: describing a graph (IELTS Task 1 style); Language of trends :: 150 words
Speaking: Part 1 and Part 2 (IELTS style); Fluency and vocabulary :: record
Vocabulary: academic word list (1); Collocations :: 30 items
Mock test (B1–B2); Analysis :: correction
Debate: technology and society; Argumentation :: speech
Vocabulary: academic word list (2); Idioms :: 30 items
Review: grammar; Review: skills :: mock test
Final test; Feedback :: summer plan`),
  E(11, `Life in society; Advanced tense review :: 15 sentences
Ancient civilizations; Narrative tenses and past modals :: story
Science and technology; Passive structures (it is said that…) :: 10 sentences
Artificial intelligence; Conditionals and alternatives (unless, provided) :: 10 sentences
Media and the internet; Reported speech and reporting verbs :: 10 sentences
Fake news and critical thinking; Hedging language :: 8 sentences
Global citizenship; Inversion and emphasis (cleft sentences) :: 10 sentences
Environment: global issues; Participle clauses :: 10 sentences
Work and economy; Future forms (advanced) :: 10 sentences
Reading: academic passages (T/F/NG, matching); Time management :: 1 passage
Listening: Sections 3–4; Note and summary completion :: 2 sections
Writing Task 1: mixed charts; Overview and comparisons :: 150 words
Writing Task 2: opinion and discussion essays; Task response :: 250 words
Speaking: Parts 2–3; Extended answers :: record
Vocabulary: academic word list; Topic vocabulary (education, environment) :: 30 items
Mock test 1 (full); Band score analysis :: correction
Writing clinic: band 6 → 7; Error correction :: rewrite essay
Mock test 2 (full); Strategy review :: correction
Grammar for ҰБТ English; ҰБТ format practice :: ҰБТ test
Review: grammar and vocabulary; Final mock :: personal plan
Final test; Exam-day strategies :: —`),
]
