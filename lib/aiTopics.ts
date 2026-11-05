// ИИ-тренажёрға арналған тапсырмалар қоры (Beles education құрастырған түпнұсқа тапсырмалар).
// Ресми емтихан материалдары емес; форматы IELTS және TOEFL iBT (2026) тапсырмаларына сай.
import type { SpeakingTask, WritingTask } from './aiGrade'

export type Topic = { id: string; text: string; target?: string }
type Bank = { task: WritingTask | SpeakingTask; title: string; hint: string; minWords?: number; seconds?: number; prep?: number; topics: Topic[] }

const t = (prefix: string, list: string[]): Topic[] => list.map((text, i) => ({ id: `${prefix}${i + 1}`, text }))

export const IELTS_WRITING: Bank[] = [
  {
    task: 'task2',
    title: 'Task 2 · Essay',
    hint: 'Кемінде 250 сөз, 40 минут. Кіріспе, 2–3 негізгі абзац, қорытынды.',
    minWords: 250,
    topics: t('iw2-', [
      'Some people believe that university education should be free for everyone, while others think students should pay for it. Discuss both views and give your own opinion.',
      'Many young people now spend several hours a day on social media. Do the advantages of this outweigh the disadvantages?',
      'In many cities, the number of private cars keeps growing. What problems does this cause, and what measures could governments take to solve them?',
      'Some people think that children should start learning a foreign language at primary school rather than secondary school. To what extent do you agree or disagree?',
      'More and more people choose to work from home. What are the benefits and drawbacks of this trend for workers and for companies?',
      'Some argue that famous sports players are paid far too much money compared with doctors and teachers. To what extent do you agree?',
      'Tourism brings money to a country, but it can also damage local culture and the environment. Discuss both sides and give your opinion.',
      'Many schools have stopped teaching handwriting and focus on typing instead. Is this a positive or negative development?',
      'Some people think that the best way to reduce crime is to give longer prison sentences. Others believe there are better alternatives. Discuss both views.',
      'In some countries, people are living longer than ever before. What problems does an ageing population create, and how can they be solved?',
      'Some people say that zoos are cruel and should be closed. Others think zoos play an important role in protecting animals. Discuss both views and give your opinion.',
      'Online shopping is replacing traditional shops. Why is this happening, and is it a good or bad thing for society?',
      'Governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?',
      'Some people believe that homework is unnecessary for primary school children. To what extent do you agree or disagree?',
      'Fast food is becoming more popular every year. What are the causes of this, and what effects does it have on people’s health?',
      'Artificial intelligence will soon replace many jobs. Do you think this will have more positive or negative effects on society?',
      'Some people think that young people should be required to do unpaid community work in their free time. To what extent do you agree?',
      'Many people believe that protecting the environment is the responsibility of governments, not individuals. Discuss both views and give your opinion.',
      'It is better for children to grow up in the countryside than in a big city. To what extent do you agree or disagree?',
      'Some universities offer online courses as an alternative to studying on campus. What are the advantages and disadvantages of online learning?',
    ]),
  },
  {
    task: 'task1',
    title: 'Task 1 · Letter (General)',
    hint: 'Кемінде 150 сөз, 20 минут. Хаттың үш тармағына да жауап беріңіз.',
    minWords: 150,
    topics: t('iw1-', [
      'You recently stayed at a hotel and left something valuable in your room. Write a letter to the hotel manager. In your letter: describe what you left, explain where you think it is, say what you would like the manager to do.',
      'Your neighbours often play loud music late at night. Write a letter to them. In your letter: explain the problem, describe how it affects you, suggest a solution.',
      'You want to take a short course to improve a skill. Write a letter to the course organiser. In your letter: say which course you are interested in, explain why you want to take it, ask for information about dates and price.',
      'A friend has invited you to their wedding, but you cannot go. Write a letter to your friend. In your letter: thank them for the invitation, explain why you cannot come, suggest another time to meet.',
      'You bought a new phone online, but it arrived damaged. Write a letter to the company. In your letter: give details of your order, describe the damage, say what you want the company to do.',
      'Your local library is going to close at weekends. Write a letter to the local council. In your letter: explain how you use the library, say why weekend opening is important, suggest what the council could do.',
      'You have just moved to a new city for work. Write a letter to an English-speaking friend. In your letter: describe your new home, talk about your job, invite your friend to visit.',
      'You saw an advertisement for a part-time job at a café. Write a letter to the manager. In your letter: introduce yourself, explain why you are suitable, say when you are available to work.',
    ]),
  },
]

export const IELTS_SPEAKING: Bank[] = [
  {
    task: 'part1',
    title: 'Part 1 · Interview',
    hint: 'Қысқа жауап: 20–40 секунд. Жауапқа себеп пен мысал қосыңыз.',
    seconds: 45,
    topics: t('is1-', [
      'Do you work or are you a student? What do you like most about it?',
      'Tell me about your hometown. What is it famous for?',
      'Do you prefer reading books or watching films? Why?',
      'How do you usually spend your weekends?',
      'What kind of music do you like? Has it changed since you were a child?',
      'Do you like cooking? What do you usually cook?',
      'How often do you use public transport? Why?',
      'What is your favourite season of the year? Why?',
      'Do you play any sports? Why or why not?',
      'Do you think it is important to have a hobby? Why?',
      'What do you usually do on your birthday?',
      'Do you prefer to study in the morning or in the evening? Why?',
      'How much time do you spend on your phone every day?',
      'Do you like visiting museums? Why or why not?',
      'What is the most interesting place you have visited in your country?',
    ]),
  },
  {
    task: 'part2',
    title: 'Part 2 · Cue card',
    hint: '1 минут дайындық, 1–2 минут сөйлеу. Барлық тармақты қамтыңыз.',
    seconds: 120,
    prep: 60,
    topics: t('is2-', [
      'Describe a teacher who has influenced you.\nYou should say:\n– who this teacher is\n– what subject they taught\n– what they were like\nand explain why they influenced you.',
      'Describe a place you would like to visit in the future.\nYou should say:\n– where it is\n– how you know about it\n– what you would do there\nand explain why you want to visit it.',
      'Describe a book you enjoyed reading.\nYou should say:\n– what the book was\n– when you read it\n– what it was about\nand explain why you enjoyed it.',
      'Describe a time when you helped someone.\nYou should say:\n– who you helped\n– what the situation was\n– how you helped\nand explain how you felt about it.',
      'Describe a skill you would like to learn.\nYou should say:\n– what the skill is\n– why you want to learn it\n– how you would learn it\nand explain how it would change your life.',
      'Describe a memorable family celebration.\nYou should say:\n– what the celebration was\n– where it took place\n– who was there\nand explain why it was memorable.',
      'Describe a piece of technology you use every day.\nYou should say:\n– what it is\n– how long you have had it\n– what you use it for\nand explain how your life would be different without it.',
      'Describe a goal you have achieved.\nYou should say:\n– what the goal was\n– when you achieved it\n– what you did to achieve it\nand explain how you felt.',
      'Describe a park or garden you like.\nYou should say:\n– where it is\n– what it looks like\n– what people do there\nand explain why you like it.',
      'Describe a person you admire who is famous.\nYou should say:\n– who this person is\n– what they do\n– how you learned about them\nand explain why you admire them.',
    ]),
  },
  {
    task: 'part3',
    title: 'Part 3 · Discussion',
    hint: 'Терең жауап: 40–60 секунд. Пікір → себеп → мысал → салыстыру.',
    seconds: 75,
    topics: t('is3-', [
      'How has technology changed the way young people communicate?',
      'Should schools teach practical life skills such as cooking and managing money? Why?',
      'Why do some people prefer living in big cities while others prefer small towns?',
      'Do you think people read less today than in the past? Why?',
      'What makes a good teacher, in your opinion?',
      'How can governments encourage people to live a healthier lifestyle?',
      'Is it better to travel alone or with a group? Why?',
      'Will robots and artificial intelligence change education in the future? How?',
      'Why is it important to protect traditional culture?',
      'Do famous people have a responsibility to be good role models?',
    ]),
  },
]

export const TOEFL_WRITING: Bank[] = [
  {
    task: 'email',
    title: 'Write an Email',
    hint: 'Шамамен 7 минут, 80–120 сөз. Хаттағы барлық талапқа жауап беріңіз, әдепті тон.',
    minWords: 80,
    topics: t('tw1-', [
      'Your professor has cancelled next week’s class and asked students to suggest how to make up the missed material. Write an email to your professor. In your email: thank the professor for asking, suggest one way to make up the class, explain why your idea would work.',
      'You borrowed a book from a classmate and accidentally damaged it. Write an email to your classmate. In your email: apologise, explain what happened, offer a solution.',
      'Your university club is organising a trip and you are responsible for choosing the place. Write an email to the club members. In your email: describe the place you chose, explain why, give practical details about the trip.',
      'You missed an important deadline for a group project because you were ill. Write an email to your group. In your email: explain the situation, describe what you have already done, suggest how you can help now.',
      'The campus library has reduced its opening hours. Write an email to the library director. In your email: explain how this affects you, give one reason why longer hours are important, suggest a compromise.',
      'A friend asked for your advice about choosing between two summer courses. Write an email to your friend. In your email: compare the two options, recommend one, explain your recommendation.',
    ]),
  },
  {
    task: 'discussion',
    title: 'Academic Discussion',
    hint: 'Шамамен 10 минут, кемінде 100 сөз. Пікіріңізді нақты айтып, себеп пен мысал келтіріңіз.',
    minWords: 100,
    topics: t('tw2-', [
      'Professor: This week we are discussing education. Some people think that university students should be required to take courses outside their major, such as art or history. Others think students should focus only on their field. What is your opinion, and why?\nAnna: I think extra courses make students more creative and open-minded.\nDaniyar: I disagree. University is expensive, and students need time to master their own subject.',
      'Professor: Cities are growing quickly. Should city governments spend more money on public parks or on new housing? Explain your view.\nLaura: Parks are essential for people’s health and happiness.\nMarat: Housing is the bigger problem — many families cannot afford a home.',
      'Professor: Technology in the classroom is our topic. Some schools give every student a tablet. Is this a good idea? Why or why not?\nSaule: Tablets give access to many learning resources.\nTom: They are distracting, and students learn better with paper books.',
      'Professor: Many companies now allow employees to work four days a week. Do you think a four-day work week is a good idea for society?\nAigerim: People would be more rested and productive.\nJames: Businesses might lose money and customers might suffer.',
      'Professor: Should museums be free for everyone, paid for by the government? Share your opinion.\nNurlan: Free museums help everyone learn about culture and history.\nEmma: Visitors should pay so that taxpayers do not cover all the costs.',
      'Professor: Some people believe that space exploration is a waste of money while there are problems on Earth. Others think it is essential for the future. What do you think?\nArman: We should solve problems like poverty first.\nSofia: Space research creates technology that helps everyone on Earth.',
    ]),
  },
]

export const TOEFL_SPEAKING: Bank[] = [
  {
    task: 'interview',
    title: 'Take an Interview',
    hint: 'Әр жауап 45 секундқа дейін. Нақты жауап + себеп + мысал.',
    seconds: 45,
    topics: t('ts1-', [
      'Tell me about a subject at school that you find difficult. Why is it difficult for you?',
      'Some people prefer to study in groups, while others prefer to study alone. Which do you prefer and why?',
      'Describe a tradition in your country that you enjoy.',
      'If you could change one thing about your town, what would it be and why?',
      'Do you think students should have part-time jobs? Explain your opinion.',
      'What is the best piece of advice you have ever received?',
      'Would you rather live in a big city or a small town in the future? Why?',
      'How do you usually prepare for an important exam?',
      'Do you think online friends can be as close as friends you meet in person?',
      'What kind of job would you like to have in ten years, and why?',
    ]),
  },
  {
    task: 'repeat',
    title: 'Listen and Repeat',
    hint: 'Сөйлемді оқып шығып, жасырылғаннан кейін жатқа дәл қайталаңыз.',
    seconds: 12,
    topics: [
      'The library on the second floor closes at eight o’clock on weekdays.',
      'Please remember to bring your student card to the exam on Monday.',
      'The bus to the city centre leaves every fifteen minutes from the main gate.',
      'Our biology lab has been moved to the new building next to the cafeteria.',
      'If you have any questions about the assignment, you can email me directly.',
      'The museum offers free guided tours for students every Saturday morning.',
      'You need to register for the course before the end of this week.',
      'The weather forecast says it will be cold and windy tomorrow afternoon.',
    ].map((s, i) => ({ id: `tr${i + 1}`, text: 'Listen and repeat the sentence exactly.', target: s })),
  },
]

export const BANKS = { ielts: { writing: IELTS_WRITING, speaking: IELTS_SPEAKING }, toefl: { writing: TOEFL_WRITING, speaking: TOEFL_SPEAKING } }

export function findTopic(exam: 'ielts' | 'toefl', kind: 'writing' | 'speaking', task: string, id: string) {
  const bank = BANKS[exam][kind].find((b) => b.task === task)
  return bank ? { bank, topic: bank.topics.find((x) => x.id === id) ?? null } : null
}

// Күнделікті шек (ИИ шығынын бақылау үшін)
export const AI_LIMITS = { writing: 6, speaking: 20 }
