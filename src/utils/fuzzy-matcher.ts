/**
 * Fuzzy Matcher - Нечеткое сопоставление строк для извлечения и нормализации данных вакансий
 * Использует библиотеку fuse.js для умного сопоставления синонимов
 */

import Fuse from 'fuse.js';

// ===========================
// Типы данных
// ===========================

interface SkillEntry {
  normalized: string;
  synonyms: string[];
}

interface CategoryEntry {
  normalized: string;
  synonyms: string[];
}

// ===========================
// НАВЫКИ (SKILLS) - Максимально полный список
// ===========================

const SKILL_SYNONYMS: SkillEntry[] = [
  // --- Языки программирования ---
  {
    normalized: 'JavaScript',
    synonyms: [
      'javascript', 'js', 'java script', 'JS', 'JavaScript', 'ECMAScript', 
      'ES6', 'ES2015', 'ES2020', 'Node.js', 'NodeJS', 'node', 'Vanilla JS',
      'Vanilla JavaScript', 'ванильный js', 'ванильный javascript'
    ]
  },
  {
    normalized: 'TypeScript',
    synonyms: [
      'typescript', 'ts', 'TS', 'TypeScript', 'Typescript', 'type script',
      'тайпскрипт', 'типскрипт'
    ]
  },
  {
    normalized: 'Python',
    synonyms: [
      'python', 'py', 'Python', 'Python3', 'Python 3', 'Python2', 'Python 2',
      'питон', 'пайтон'
    ]
  },
  {
    normalized: 'Java',
    synonyms: [
      'java', 'JAVA', 'Java', 'Java SE', 'Java EE', 'JavaEE', 'Jakarta EE',
      'джава', 'ява'
    ]
  },
  {
    normalized: 'C#',
    synonyms: [
      'c#', 'C#', 'csharp', 'C Sharp', 'c-sharp', '.NET', 'dotnet', 'си шарп'
    ]
  },
  {
    normalized: 'C++',
    synonyms: [
      'c++', 'C++', 'cpp', 'CPP', 'C plus plus', 'си плюс плюс'
    ]
  },
  {
    normalized: 'C',
    synonyms: ['c', 'C', 'си']
  },
  {
    normalized: 'PHP',
    synonyms: [
      'php', 'PHP', 'PHP7', 'PHP 7', 'PHP8', 'PHP 8', 'пхп', 'пэхапэ'
    ]
  },
  {
    normalized: 'Ruby',
    synonyms: ['ruby', 'Ruby', 'RoR', 'Ruby on Rails', 'руби']
  },
  {
    normalized: 'Go',
    synonyms: ['go', 'Go', 'golang', 'Golang', 'го', 'голанг']
  },
  {
    normalized: 'Rust',
    synonyms: ['rust', 'Rust', 'раст']
  },
  {
    normalized: 'Swift',
    synonyms: ['swift', 'Swift', 'свифт']
  },
  {
    normalized: 'Kotlin',
    synonyms: ['kotlin', 'Kotlin', 'котлин']
  },
  {
    normalized: 'Scala',
    synonyms: ['scala', 'Scala', 'скала']
  },
  {
    normalized: 'R',
    synonyms: ['r', 'R', 'R language', 'R-lang', 'эр']
  },
  {
    normalized: 'Dart',
    synonyms: ['dart', 'Dart', 'дарт']
  },
  {
    normalized: 'Objective-C',
    synonyms: ['objective-c', 'Objective-C', 'ObjC', 'obj-c', 'обджектив си']
  },
  {
    normalized: 'Perl',
    synonyms: ['perl', 'Perl', 'перл']
  },
  {
    normalized: 'Shell',
    synonyms: [
      'shell', 'Shell', 'bash', 'Bash', 'sh', 'zsh', 'shell scripting',
      'шелл', 'баш'
    ]
  },
  {
    normalized: 'PowerShell',
    synonyms: ['powershell', 'PowerShell', 'pwsh', 'павершелл']
  },
  {
    normalized: 'Groovy',
    synonyms: ['groovy', 'Groovy', 'груви']
  },
  {
    normalized: 'Elixir',
    synonyms: ['elixir', 'Elixir', 'эликсир']
  },
  {
    normalized: 'Haskell',
    synonyms: ['haskell', 'Haskell', 'хаскель']
  },
  {
    normalized: 'Clojure',
    synonyms: ['clojure', 'Clojure', 'кложур']
  },

  // --- Frontend фреймворки и библиотеки ---
  {
    normalized: 'React',
    synonyms: [
      'react', 'React', 'ReactJS', 'React.js', 'react.js', 'реакт'
    ]
  },
  {
    normalized: 'Vue.js',
    synonyms: [
      'vue', 'Vue', 'VueJS', 'Vue.js', 'vue.js', 'Vue2', 'Vue3', 'вью', 'вуе'
    ]
  },
  {
    normalized: 'Angular',
    synonyms: [
      'angular', 'Angular', 'AngularJS', 'Angular 2', 'Angular2', 'ангулар'
    ]
  },
  {
    normalized: 'Svelte',
    synonyms: ['svelte', 'Svelte', 'SvelteKit', 'свелт']
  },
  {
    normalized: 'Next.js',
    synonyms: [
      'next', 'Next', 'nextjs', 'Next.js', 'next.js', 'некст'
    ]
  },
  {
    normalized: 'Nuxt.js',
    synonyms: [
      'nuxt', 'Nuxt', 'nuxtjs', 'Nuxt.js', 'nuxt.js', 'нукст'
    ]
  },
  {
    normalized: 'Gatsby',
    synonyms: ['gatsby', 'Gatsby', 'GatsbyJS', 'гэтсби']
  },
  {
    normalized: 'Ember.js',
    synonyms: ['ember', 'Ember', 'EmberJS', 'Ember.js', 'эмбер']
  },
  {
    normalized: 'Backbone.js',
    synonyms: ['backbone', 'Backbone', 'BackboneJS', 'Backbone.js', 'бэкбоун']
  },
  {
    normalized: 'jQuery',
    synonyms: ['jquery', 'jQuery', 'JQuery', 'джейквери']
  },
  {
    normalized: 'Redux',
    synonyms: ['redux', 'Redux', 'React-Redux', 'редакс']
  },
  {
    normalized: 'MobX',
    synonyms: ['mobx', 'MobX', 'MobX-React', 'мобикс']
  },
  {
    normalized: 'Webpack',
    synonyms: ['webpack', 'Webpack', 'вебпак']
  },
  {
    normalized: 'Vite',
    synonyms: ['vite', 'Vite', 'вайт']
  },
  {
    normalized: 'Parcel',
    synonyms: ['parcel', 'Parcel', 'парсел']
  },
  {
    normalized: 'Rollup',
    synonyms: ['rollup', 'Rollup', 'роллап']
  },
  {
    normalized: 'Tailwind CSS',
    synonyms: [
      'tailwind', 'Tailwind', 'tailwindcss', 'Tailwind CSS', 'тейлвинд'
    ]
  },
  {
    normalized: 'Bootstrap',
    synonyms: [
      'bootstrap', 'Bootstrap', 'Bootstrap 4', 'Bootstrap 5', 'бутстрап'
    ]
  },
  {
    normalized: 'Material-UI',
    synonyms: [
      'material-ui', 'Material-UI', 'MUI', 'material ui', 'материал юай'
    ]
  },
  {
    normalized: 'Ant Design',
    synonyms: ['antd', 'Ant Design', 'ant-design', 'ант дизайн']
  },
  {
    normalized: 'Chakra UI',
    synonyms: ['chakra', 'Chakra UI', 'chakra-ui', 'чакра']
  },

  // --- Backend фреймворки ---
  {
    normalized: 'Node.js',
    synonyms: [
      'node', 'Node', 'nodejs', 'Node.js', 'node.js', 'NodeJS', 'нода'
    ]
  },
  {
    normalized: 'Express.js',
    synonyms: [
      'express', 'Express', 'expressjs', 'Express.js', 'express.js', 'экспресс'
    ]
  },
  {
    normalized: 'NestJS',
    synonyms: ['nest', 'NestJS', 'Nest.js', 'nest.js', 'нест']
  },
  {
    normalized: 'Fastify',
    synonyms: ['fastify', 'Fastify', 'фастифай']
  },
  {
    normalized: 'Koa',
    synonyms: ['koa', 'Koa', 'Koa.js', 'коа']
  },
  {
    normalized: 'Django',
    synonyms: ['django', 'Django', 'джанго']
  },
  {
    normalized: 'Flask',
    synonyms: ['flask', 'Flask', 'фласк']
  },
  {
    normalized: 'FastAPI',
    synonyms: ['fastapi', 'FastAPI', 'fast api', 'фаст апи']
  },
  {
    normalized: 'Spring',
    synonyms: [
      'spring', 'Spring', 'Spring Boot', 'SpringBoot', 'Spring Framework',
      'спринг'
    ]
  },
  {
    normalized: 'Laravel',
    synonyms: ['laravel', 'Laravel', 'ларавел']
  },
  {
    normalized: 'Symfony',
    synonyms: ['symfony', 'Symfony', 'симфони']
  },
  {
    normalized: 'Ruby on Rails',
    synonyms: [
      'rails', 'Rails', 'RoR', 'Ruby on Rails', 'рельсы', 'руби он рельс'
    ]
  },
  {
    normalized: 'ASP.NET',
    synonyms: [
      'asp.net', 'ASP.NET', 'aspnet', 'ASP.NET Core', 'asp net', 'асп нет'
    ]
  },
  {
    normalized: 'Gin',
    synonyms: ['gin', 'Gin', 'Gin-Gonic', 'джин']
  },
  {
    normalized: 'Echo',
    synonyms: ['echo', 'Echo', 'эхо']
  },

  // --- Базы данных ---
  {
    normalized: 'SQL',
    synonyms: [
      'sql', 'SQL', 'Structured Query Language', 'эс кью эль', 'скуль'
    ]
  },
  {
    normalized: 'MySQL',
    synonyms: ['mysql', 'MySQL', 'My SQL', 'майскуль']
  },
  {
    normalized: 'PostgreSQL',
    synonyms: [
      'postgresql', 'PostgreSQL', 'postgres', 'Postgres', 'pg', 'постгрес'
    ]
  },
  {
    normalized: 'MongoDB',
    synonyms: ['mongodb', 'MongoDB', 'Mongo', 'mongo', 'монго', 'монгодб']
  },
  {
    normalized: 'Redis',
    synonyms: ['redis', 'Redis', 'редис']
  },
  {
    normalized: 'Elasticsearch',
    synonyms: [
      'elasticsearch', 'Elasticsearch', 'elastic search', 'ES', 'эластик'
    ]
  },
  {
    normalized: 'SQLite',
    synonyms: ['sqlite', 'SQLite', 'SQL Lite', 'скулайт']
  },
  {
    normalized: 'MariaDB',
    synonyms: ['mariadb', 'MariaDB', 'мариадб']
  },
  {
    normalized: 'Oracle',
    synonyms: [
      'oracle', 'Oracle', 'Oracle DB', 'Oracle Database', 'оракл'
    ]
  },
  {
    normalized: 'Microsoft SQL Server',
    synonyms: [
      'mssql', 'MSSQL', 'MS SQL', 'SQL Server', 'Microsoft SQL Server',
      'эмэс скуль'
    ]
  },
  {
    normalized: 'Cassandra',
    synonyms: ['cassandra', 'Cassandra', 'кассандра']
  },
  {
    normalized: 'CouchDB',
    synonyms: ['couchdb', 'CouchDB', 'Couch DB', 'кауч дб']
  },
  {
    normalized: 'DynamoDB',
    synonyms: ['dynamodb', 'DynamoDB', 'Dynamo DB', 'динамодб']
  },
  {
    normalized: 'Neo4j',
    synonyms: ['neo4j', 'Neo4j', 'neo', 'нео']
  },

  // --- DevOps и инфраструктура ---
  {
    normalized: 'Docker',
    synonyms: ['docker', 'Docker', 'докер']
  },
  {
    normalized: 'Kubernetes',
    synonyms: ['kubernetes', 'Kubernetes', 'k8s', 'K8s', 'кубернетес']
  },
  {
    normalized: 'Jenkins',
    synonyms: ['jenkins', 'Jenkins', 'дженкинс']
  },
  {
    normalized: 'GitLab CI',
    synonyms: [
      'gitlab', 'GitLab', 'gitlab ci', 'GitLab CI', 'gitlab-ci', 'гитлаб'
    ]
  },
  {
    normalized: 'GitHub Actions',
    synonyms: [
      'github actions', 'GitHub Actions', 'github action', 'гитхаб экшнс'
    ]
  },
  {
    normalized: 'CircleCI',
    synonyms: ['circleci', 'CircleCI', 'circle ci', 'серкл си ай']
  },
  {
    normalized: 'Travis CI',
    synonyms: ['travis', 'Travis', 'Travis CI', 'travis ci', 'тревис']
  },
  {
    normalized: 'Terraform',
    synonyms: ['terraform', 'Terraform', 'терраформ']
  },
  {
    normalized: 'Ansible',
    synonyms: ['ansible', 'Ansible', 'ансибл']
  },
  {
    normalized: 'Chef',
    synonyms: ['chef', 'Chef', 'шеф']
  },
  {
    normalized: 'Puppet',
    synonyms: ['puppet', 'Puppet', 'паппет']
  },
  {
    normalized: 'AWS',
    synonyms: [
      'aws', 'AWS', 'Amazon Web Services', 'амазон веб сервисес', 'авс'
    ]
  },
  {
    normalized: 'Azure',
    synonyms: [
      'azure', 'Azure', 'Microsoft Azure', 'майкрософт азур', 'ажур'
    ]
  },
  {
    normalized: 'Google Cloud',
    synonyms: [
      'gcp', 'GCP', 'google cloud', 'Google Cloud', 'Google Cloud Platform',
      'гугл клауд'
    ]
  },
  {
    normalized: 'Heroku',
    synonyms: ['heroku', 'Heroku', 'хероку']
  },
  {
    normalized: 'DigitalOcean',
    synonyms: [
      'digitalocean', 'DigitalOcean', 'digital ocean', 'диджитал оушен'
    ]
  },
  {
    normalized: 'Nginx',
    synonyms: ['nginx', 'Nginx', 'NGINX', 'энджинекс']
  },
  {
    normalized: 'Apache',
    synonyms: [
      'apache', 'Apache', 'Apache HTTP Server', 'Apache2', 'апач'
    ]
  },

  // --- Тестирование ---
  {
    normalized: 'Jest',
    synonyms: ['jest', 'Jest', 'джест']
  },
  {
    normalized: 'Mocha',
    synonyms: ['mocha', 'Mocha', 'мока']
  },
  {
    normalized: 'Chai',
    synonyms: ['chai', 'Chai', 'чай']
  },
  {
    normalized: 'Jasmine',
    synonyms: ['jasmine', 'Jasmine', 'жасмин']
  },
  {
    normalized: 'Cypress',
    synonyms: ['cypress', 'Cypress', 'кипарис']
  },
  {
    normalized: 'Selenium',
    synonyms: ['selenium', 'Selenium', 'селениум']
  },
  {
    normalized: 'Puppeteer',
    synonyms: ['puppeteer', 'Puppeteer', 'паппетир']
  },
  {
    normalized: 'Playwright',
    synonyms: ['playwright', 'Playwright', 'плейрайт']
  },
  {
    normalized: 'TestCafe',
    synonyms: ['testcafe', 'TestCafe', 'test cafe', 'тест кафе']
  },
  {
    normalized: 'PyTest',
    synonyms: ['pytest', 'PyTest', 'py.test', 'пайтест']
  },
  {
    normalized: 'JUnit',
    synonyms: ['junit', 'JUnit', 'джей юнит']
  },
  {
    normalized: 'TestNG',
    synonyms: ['testng', 'TestNG', 'test ng', 'тест эн джи']
  },

  // --- Системы контроля версий ---
  {
    normalized: 'Git',
    synonyms: ['git', 'Git', 'гит']
  },
  {
    normalized: 'GitHub',
    synonyms: ['github', 'GitHub', 'git hub', 'гитхаб']
  },
  {
    normalized: 'GitLab',
    synonyms: ['gitlab', 'GitLab', 'git lab', 'гитлаб']
  },
  {
    normalized: 'Bitbucket',
    synonyms: ['bitbucket', 'Bitbucket', 'bit bucket', 'битбакет']
  },
  {
    normalized: 'SVN',
    synonyms: ['svn', 'SVN', 'Subversion', 'сабверсион']
  },

  // --- Mobile разработка ---
  {
    normalized: 'React Native',
    synonyms: [
      'react native', 'React Native', 'react-native', 'RN', 'реакт нейтив'
    ]
  },
  {
    normalized: 'Flutter',
    synonyms: ['flutter', 'Flutter', 'флаттер']
  },
  {
    normalized: 'Xamarin',
    synonyms: ['xamarin', 'Xamarin', 'ксамарин']
  },
  {
    normalized: 'Ionic',
    synonyms: ['ionic', 'Ionic', 'ионик']
  },
  {
    normalized: 'Cordova',
    synonyms: ['cordova', 'Cordova', 'PhoneGap', 'кордова']
  },
  {
    normalized: 'SwiftUI',
    synonyms: ['swiftui', 'SwiftUI', 'Swift UI', 'свифт ю ай']
  },
  {
    normalized: 'Jetpack Compose',
    synonyms: [
      'jetpack compose', 'Jetpack Compose', 'jetpack-compose', 'джетпак компоуз'
    ]
  },

  // --- Data Science / ML / AI ---
  {
    normalized: 'TensorFlow',
    synonyms: ['tensorflow', 'TensorFlow', 'tensor flow', 'тензорфлоу']
  },
  {
    normalized: 'PyTorch',
    synonyms: ['pytorch', 'PyTorch', 'py torch', 'пайторч']
  },
  {
    normalized: 'Keras',
    synonyms: ['keras', 'Keras', 'керас']
  },
  {
    normalized: 'Scikit-learn',
    synonyms: [
      'scikit-learn', 'Scikit-learn', 'sklearn', 'scikit learn', 'сайкит лерн'
    ]
  },
  {
    normalized: 'Pandas',
    synonyms: ['pandas', 'Pandas', 'пандас']
  },
  {
    normalized: 'NumPy',
    synonyms: ['numpy', 'NumPy', 'Numpy', 'нампай']
  },
  {
    normalized: 'Matplotlib',
    synonyms: ['matplotlib', 'Matplotlib', 'матплотлиб']
  },
  {
    normalized: 'Seaborn',
    synonyms: ['seaborn', 'Seaborn', 'сиборн']
  },
  {
    normalized: 'OpenCV',
    synonyms: ['opencv', 'OpenCV', 'Open CV', 'опен си ви']
  },
  {
    normalized: 'NLTK',
    synonyms: ['nltk', 'NLTK', 'Natural Language Toolkit', 'эн эл ти кей']
  },
  {
    normalized: 'spaCy',
    synonyms: ['spacy', 'spaCy', 'SpaCy', 'спейси']
  },

  // --- CMS / E-commerce ---
  {
    normalized: 'WordPress',
    synonyms: ['wordpress', 'WordPress', 'word press', 'вордпресс']
  },
  {
    normalized: 'Drupal',
    synonyms: ['drupal', 'Drupal', 'друпал']
  },
  {
    normalized: 'Joomla',
    synonyms: ['joomla', 'Joomla', 'джумла']
  },
  {
    normalized: 'Magento',
    synonyms: ['magento', 'Magento', 'маженто']
  },
  {
    normalized: 'Shopify',
    synonyms: ['shopify', 'Shopify', 'шопифай']
  },
  {
    normalized: 'WooCommerce',
    synonyms: ['woocommerce', 'WooCommerce', 'woo commerce', 'вукомерс']
  },

  // --- Markup / Styling ---
  {
    normalized: 'HTML',
    synonyms: [
      'html', 'HTML', 'HTML5', 'html5', 'HyperText Markup Language', 'эйчтиэмэль'
    ]
  },
  {
    normalized: 'CSS',
    synonyms: [
      'css', 'CSS', 'CSS3', 'css3', 'Cascading Style Sheets', 'си эс эс'
    ]
  },
  {
    normalized: 'Sass',
    synonyms: ['sass', 'Sass', 'SASS', 'сасс']
  },
  {
    normalized: 'SCSS',
    synonyms: ['scss', 'SCSS', 'Scss', 'эс си эс эс']
  },
  {
    normalized: 'Less',
    synonyms: ['less', 'Less', 'LESS', 'лесс']
  },
  {
    normalized: 'Stylus',
    synonyms: ['stylus', 'Stylus', 'стилус']
  },

  // --- GraphQL / API ---
  {
    normalized: 'GraphQL',
    synonyms: ['graphql', 'GraphQL', 'graph ql', 'графкуель']
  },
  {
    normalized: 'REST API',
    synonyms: [
      'rest', 'REST', 'rest api', 'REST API', 'RESTful', 'рест апи'
    ]
  },
  {
    normalized: 'gRPC',
    synonyms: ['grpc', 'gRPC', 'GRPC', 'джи ар пи си']
  },
  {
    normalized: 'WebSocket',
    synonyms: [
      'websocket', 'WebSocket', 'web socket', 'ws', 'вебсокет'
    ]
  },
  {
    normalized: 'Socket.io',
    synonyms: ['socket.io', 'Socket.io', 'socketio', 'сокет ио']
  },

  // --- ORM / ODM ---
  {
    normalized: 'Prisma',
    synonyms: ['prisma', 'Prisma', 'призма']
  },
  {
    normalized: 'Sequelize',
    synonyms: ['sequelize', 'Sequelize', 'секвелайз']
  },
  {
    normalized: 'TypeORM',
    synonyms: ['typeorm', 'TypeORM', 'type orm', 'тайп ор эм']
  },
  {
    normalized: 'Mongoose',
    synonyms: ['mongoose', 'Mongoose', 'мангуст']
  },
  {
    normalized: 'Hibernate',
    synonyms: ['hibernate', 'Hibernate', 'хиберней']
  },
  {
    normalized: 'Entity Framework',
    synonyms: [
      'entity framework', 'Entity Framework', 'EF', 'ef core', 'энтити фреймворк'
    ]
  },

  // --- Дизайн / UX ---
  {
    normalized: 'Figma',
    synonyms: ['figma', 'Figma', 'фигма']
  },
  {
    normalized: 'Adobe XD',
    synonyms: ['xd', 'XD', 'Adobe XD', 'adobe xd', 'икс ди']
  },
  {
    normalized: 'Sketch',
    synonyms: ['sketch', 'Sketch', 'скетч']
  },
  {
    normalized: 'Photoshop',
    synonyms: [
      'photoshop', 'Photoshop', 'PS', 'Adobe Photoshop', 'фотошоп'
    ]
  },
  {
    normalized: 'Illustrator',
    synonyms: [
      'illustrator', 'Illustrator', 'AI', 'Adobe Illustrator', 'иллюстратор'
    ]
  },

  // --- Blockchain / Web3 ---
  {
    normalized: 'Solidity',
    synonyms: ['solidity', 'Solidity', 'солидити']
  },
  {
    normalized: 'Ethereum',
    synonyms: ['ethereum', 'Ethereum', 'ETH', 'эфириум']
  },
  {
    normalized: 'Web3',
    synonyms: ['web3', 'Web3', 'web 3', 'веб3']
  },
  {
    normalized: 'Smart Contracts',
    synonyms: [
      'smart contracts', 'Smart Contracts', 'smart contract', 'смарт контракты'
    ]
  },

  // --- Другие технологии ---
  {
    normalized: 'XML',
    synonyms: [
      'xml', 'XML', 'Extensible Markup Language', 'икс эм эль'
    ]
  },
  {
    normalized: 'JSON',
    synonyms: [
      'json', 'JSON', 'JavaScript Object Notation', 'джейсон'
    ]
  },
  {
    normalized: 'YAML',
    synonyms: ['yaml', 'YAML', 'yml', 'YML', 'ямл']
  },
  {
    normalized: 'RabbitMQ',
    synonyms: ['rabbitmq', 'RabbitMQ', 'rabbit mq', 'рэббит эм кью']
  },
  {
    normalized: 'Kafka',
    synonyms: ['kafka', 'Kafka', 'Apache Kafka', 'кафка']
  },
  {
    normalized: 'Microservices',
    synonyms: [
      'microservices', 'Microservices', 'micro services', 'микросервисы'
    ]
  },
  {
    normalized: 'CI/CD',
    synonyms: [
      'ci/cd', 'CI/CD', 'cicd', 'CICD', 'continuous integration',
      'continuous deployment', 'си ай си ди'
    ]
  },
  {
    normalized: 'Agile',
    synonyms: ['agile', 'Agile', 'agile methodology', 'эджайл']
  },
  {
    normalized: 'Scrum',
    synonyms: ['scrum', 'Scrum', 'SCRUM', 'скрам']
  },
  {
    normalized: 'Kanban',
    synonyms: ['kanban', 'Kanban', 'канбан']
  },
  {
    normalized: 'Jira',
    synonyms: ['jira', 'Jira', 'JIRA', 'джира']
  },
  {
    normalized: 'Confluence',
    synonyms: ['confluence', 'Confluence', 'конфлюенс']
  },
  {
    normalized: 'Slack',
    synonyms: ['slack', 'Slack', 'слэк']
  },
  {
    normalized: 'Trello',
    synonyms: ['trello', 'Trello', 'трелло']
  },
  {
    normalized: 'Notion',
    synonyms: ['notion', 'Notion', 'ноушен']
  },
  {
    normalized: 'Microsoft Office',
    synonyms: [
      'microsoft office', 'ms office', 'office', 'пакет офис',
      'уверенный пользователь пк', 'знание пк', 'operare pc',
      'cunostinte pc', 'utilizator pc', 'word/excel'
    ]
  },
  {
    normalized: 'Microsoft Excel',
    synonyms: [
      'excel', 'Excel', 'ms excel', 'эксель', 'ексель', 'сводные таблицы',
      'vlookup', 'формулы excel', 'tabel', 'tabele', 'excel avansat',
      'продвинутый excel'
    ]
  },
  {
    normalized: '1C',
    synonyms: [
      '1c', '1C', '1с', '1С', '1c предприятие', '1с бухгалтерия',
      '1c enterprise', '1c contabilitate', 'программа 1с', 'знание 1с',
      'cunoasterea 1c', '1c 8.3', '1c 8.2', '1c 7.7'
    ]
  },
  {
    normalized: 'Google Docs/Sheets',
    synonyms: [
      'google docs', 'google sheets', 'гугл докс', 'гугл таблицы',
      'google workspace', 'g-suite', 'работа с таблицами'
    ]
  },
  // --- Дополнительные Soft Skills (ОЧЕНЬ ВАЖНО для Молдовы) ---
  // Часто вакансии содержат только эти слова
  {
    normalized: 'Punctuality',
    synonyms: [
      'punctuality', 'punctual', 'пунктуальность', 'пунктуальный',
      'punctualitate', 'punctual', 'fara intarzieri'
    ]
  },
  {
    normalized: 'Active Person',
    synonyms: [
      'active', 'proactive', 'energy', 'активность', 'активный', 'энергичный',
      'activ', 'energic', 'proactiv', 'initiativa', 'инициативность'
    ]
  },
  {
    normalized: 'Fast Learner',
    synonyms: [
      'fast learner', 'обучаемость', 'быстрая обучаемость', 'желание учиться',
      'capacitate de invatare', 'dorinta de a invata', 'instruire rapida'
    ]
  },
  {
    normalized: 'Attention to Detail',
    synonyms: [
      'attention to detail', 'attentive', 'внимательность', 'внимание к деталям',
      'atentie la detalii', 'atent', 'scrupulozitate', 'аккуратность'
    ]
  },
  {
    normalized: 'Honesty',
    synonyms: [
      'honesty', 'honest', 'честность', 'порядочность',
      'onestitate', 'cinstit', 'corectitudine'
    ]
  },
  {
    normalized: 'Discipline',
    synonyms: [
      'discipline', 'disciplined', 'дисциплинированность', 'дисциплина',
      'disciplina', 'disciplinat', 'seriozitate', 'Дисциплина труда'
    ]
  },
  {
    normalized: 'Communication',
    synonyms: [
      'communication', 'communicative', 'коммуникабельность', 'общение',
      'comunicare', 'sociabil', 'abilitati de comunicare', 'грамотная речь'
    ]
  },
  {
    normalized: 'Teamwork',
    synonyms: [
      'teamwork', 'team player', 'работа в команде', 'командный игрок',
      'lucru in echipa', 'spirit de echipa'
    ]
  },
  {
    normalized: 'Responsibility',
    synonyms: [
      'responsibility', 'responsible', 'ответственность', 'ответственный',
      'responsabilitate', 'responsabil', 'punctuality', 'пунктуальность'
    ]
  },
  {
    normalized: 'Stress Resistance',
    synonyms: [
      'stress resistance', 'стрессоустойчивость', 'работа под давлением',
      'rezistenta la stres', 'rezistent la stres'
    ]
  },
  {
    normalized: 'Leadership',
    synonyms: [
      'leadership', 'management', 'лидерство', 'управление командой',
      'руководство', 'lider', 'conducere', 'managementul echipei'
    ]
  },
  // ==================================================
  // РАСШИРЕННЫЙ СПИСОК: HARD SKILLS (БЕЗ НАЗВАНИЙ ПРОФЕССИЙ)
  // ==================================================

  // --- Розничная торговля (Навыки) ---
  {
    normalized: 'Cash Register Operations',
    synonyms: [
      'cash register', 'работа с кассой', 'кассовая дисциплина',
      'aparat de casa', 'lucru cu aparatul de casă', 'incasare',
      'кассовые операции', 'наличный расчет', 'operatiuni cu numerar'
    ]
  },
  {
    normalized: 'Merchandising',
    synonyms: [
      'merchandising', 'выкладка товара', 'aranjarea marfii',
      'aranjarea mărfii', 'controlul rafturilor', 'ротация товара',
      'контроль сроков годности', 'termen de valabilitate', 'planograma'
    ]
  },
  {
    normalized: 'Inventory Management',
    synonyms: [
      'inventory', 'stock taking', 'инвентаризация', 'учет остатков', 'ревизия',
      'inventariere', 'revizie', 'evidenta stocurilor', 'gestiune stoc'
    ]
  },
  {
    normalized: 'Store Management',
    synonyms: [ // Не "Директор магазина", а "Управление магазином"
      'store management', 'shop management', 'управление магазином',
      'gestiune magazin', 'открытие смены', 'inchiderea turei',
      'администрирование торгового зала'
    ]
  },

  // --- Медицина и Фармацевтика (Навыки) ---
  {
    normalized: 'Medical Diagnostics',
    synonyms: [
      'diagnosis', 'medical diagnostics', 'постановка диагноза',
      'diagnosticul', 'consultatie medicala', 'медицинский осмотр',
      'anamneza', 'сбор анамнеза'
    ]
  },
  {
    normalized: 'Medical Procedures',
    synonyms: [
      // Вместо "Медсестра" -> навыки выполнения процедур
      'injections', 'уколы', 'iniectii', 'perfuzii', 'капельницы',
      'intravenous', 'intramuscular', 'внутривенно', 'recoltarea sangelui',
      'забор крови', 'перевязки', 'pansemante'
    ]
  },
  {
    normalized: 'Pharmaceutical Knowledge',
    synonyms: [
      // Вместо "Фармацевт" -> знание препаратов
      'pharmacology', 'фармакология', 'znanie lekarstv', 'знание лекарств',
      'medicamente', 'eliberarea retetelor', 'отпуск лекарств',
      'консультация по препаратам'
    ]
  },
  {
    normalized: 'Dental Treatment',
    synonyms: [
      // Вместо "Стоматолог" -> лечение зубов
      'dental treatment', 'lechenie zubov', 'лечение зубов', 'tratament dentar',
      'protezare', 'протезирование', 'пломбирование', 'plombare',
      'detartraj', 'чистка зубов'
    ]
  },

  // --- Индустрия красоты (Навыки) ---
  {
    normalized: 'Hair Styling',
    synonyms: [
      // Вместо "Парикмахер"
      'haircut', 'стрижка', 'tunsoare', 'coafura', 'укладка волос',
      'hair coloring', 'окрашивание волос', 'vopsirea parului', 'колористика'
    ]
  },
  {
    normalized: 'Nail Service',
    synonyms: [
      // Вместо "Маникюрщица"
      'manicure', 'pedicure', 'маникюр', 'педикюр', 'manichiura',
      'pedichiura', 'alungirea unghiilor', 'наращивание ногтей',
      'acoperire cu gel', 'покрытие гель-лаком'
    ]
  },
  {
    normalized: 'Cosmetology Procedures',
    synonyms: [
      // Вместо "Косметолог"
      'facial cleaning', 'чистка лица', 'curatarea fetei', 'peeling',
      'пилинг', 'depilare', 'epilare', 'депиляция', 'шугаринг',
      'инъекционная косметология'
    ]
  },
  {
    normalized: 'Massage Techniques',
    synonyms: [
      // Вместо "Массажист"
      'massage', 'masaj', 'массаж', 'классический массаж',
      'masaj terapeutic', 'лечебный массаж', 'kinetoterapie'
    ]
  },

  // --- Юриспруденция (Навыки - здесь все было почти верно) ---
  {
    normalized: 'Civil Law',
    synonyms: [
      'civil law', 'grajdanskoe pravo', 'гражданское право', 'drept civil',
      'codul civil', 'гражданский кодекс'
    ]
  },
  {
    normalized: 'Contract Drafting',
    synonyms: [
      'contract drafting', 'составление договоров', 'анализ договоров',
      'elaborare contracte', 'redactare contracte', 'экспертиза договоров'
    ]
  },
  {
    normalized: 'Litigation',
    synonyms: [
      'litigation', 'court representation', 'представительство в суде',
      'instanta de judecata', 'litigii', 'судебные споры', 'защита в суде'
    ]
  },

  // --- Автосервис и Транспорт (Навыки) ---
  {
    normalized: 'Car Repair',
    synonyms: [
      // Вместо "Автомеханик"
      'car repair', 'ремонт автомобилей', 'reparatie auto',
      'chassis repair', 'ремонт ходовой', 'reparatie sasiu',
      'engine repair', 'ремонт двигателя', 'reparatia motorului'
    ]
  },
  {
    normalized: 'Auto Diagnostics',
    synonyms: [
      // Вместо "Автоэлектрик"
      'auto diagnostics', 'computer diagnostics', 'компьютерная диагностика авто',
      'diagnostica auto', 'чтение ошибок', 'сканер авто'
    ]
  },
  {
    normalized: 'Passenger Transportation',
    synonyms: [
      // Вместо "Таксист" -> навык перевозки
      'passenger transport', 'transport pasageri', 'перевозка пассажиров',
      'servicii taxi', 'работа в такси (как опыт)', 'yandex go', 'bolt partner'
    ]
  },
  {
    normalized: 'Freight Transport',
    synonyms: [
      // Вместо "Дальнобойщик"
      'freight transport', 'грузоперевозки', 'transport marfa',
      'transport international', 'международные перевозки',
      'expeditie', 'transportation logistics'
    ]
  },

  // --- Рабочие навыки (Blue Collar Skills) ---
  {
    normalized: 'Welding',
    synonyms: [
      // Здесь ОК, сварка - это процесс
      'welding', 'сварка', 'sudare', 'lucrari de sudare',
      'mig/mag', 'argon', 'аргонная сварка', 'elektrosvarka'
    ]
  },
  {
    normalized: 'Plumbing Works',
    synonyms: [
      // Вместо "Сантехник"
      'plumbing', 'сантехнические работы', 'lucrari sanitare',
      'instalare tevi', 'montare robinete', 'установка сантехники',
      'repair pipes', 'ремонт труб'
    ]
  },
  {
    normalized: 'Furniture Assembly',
    synonyms: [
      // Вместо "Сборщик"
      'furniture assembly', 'сборка мебели', 'asamblarea mobilei',
      'montare mobila', 'debitare', 'raspil', 'кромирование'
    ]
  },
  {
    normalized: 'Electrical Wiring',
    synonyms: [
      // Вместо "Электрик"
      'electrical wiring', 'electromontaj', 'электромонтажные работы',
      'procladka cablului', 'прокладка кабеля', 'установка розеток',
      'montare prizelor', 'cablare'
    ]
  },
  {
    normalized: 'Physical Security',
    synonyms: [
      // Вместо "Охранник"
      'security surveillance', 'охрана объектов', 'paza obiectivelor',
      'monitorizare video', 'видеонаблюдение', 'control acces',
      'контрольно-пропускной режим'
    ]
  },
  {
    normalized: 'Cleaning Services',
    synonyms: [
      // Вместо "Уборщица"
      'cleaning', 'professional cleaning', 'уборка помещений',
      'curatenie', 'curatenie generala', 'dry cleaning', 'химчистка',
      'spalare geamuri', 'мойка окон', 'sanitizing'
    ]
  },

  // --- Образование и Языки (Навыки) ---
  {
    normalized: 'Teaching',
    synonyms: [
      // Вместо "Учитель"
      'teaching', 'preu', 'преподавание', 'predare', 'instruire',
      'обучение детей', 'educatie', 'metodica predarii', 'методика преподавания'
    ]
  },
  {
    normalized: 'Translation',
    synonyms: [
      // Здесь ОК, перевод - это действие
      'translation', 'written translation', 'письменный перевод',
      'traducere scrisa', 'interpretariat', 'устный перевод',
      'traducere simultana'
    ]
  },
  // --- Логистика, Склад и Транспорт ---
  {
    normalized: 'Driving License B',
    synonyms: [
      'category b', 'cat. b', 'категория b', 'права b', 'права категории b',
      'водительское удостоверение', 'permis de conducere', 'categoria b',
      'permis auto', 'auto propriu', 'личный автомобиль', 'категория B'
    ]
  },
  {
    normalized: 'Driving License C/E',
    synonyms: [
      'category c', 'category e', 'cat. c', 'грузоперевозки', 'категория с',
      'дальнобойщик', 'sofer expeditie', 'tir', 'camion', 'категория C'
    ]
  },
  // ==================================================
  // ДОПОЛНИТЕЛЬНЫЕ SOFT SKILLS И ОБЩИЕ НАВЫКИ (GENERAL)
  // ==================================================

  // --- Организация работы и Мышление ---
  {
    normalized: 'Multitasking',
    synonyms: [
      'multitasking', 'multi-tasking', 'многозадачность', 'режим многозадачности',
      'выполнение нескольких задач', 'sarcini multiple', 'abilitatea de a face mai multe lucruri',
      'lucru concomitent'
    ]
  },
  {
    normalized: 'Problem Solving',
    synonyms: [
      'problem solving', 'решение проблем', 'находчивость', 'умение находить выход',
      'rezolvarea problemelor', 'soluționarea problemelor', 'orientare spre solutii',
      'смекалка'
    ]
  },
  {
    normalized: 'Critical Thinking',
    synonyms: [
      'critical thinking', 'analitical skills', 'аналитический склад ума', 'аналитическое мышление',
      'gandire critica', 'gandire analitica', 'analiza'
    ]
  },

  // --- Компьютерная грамотность (Базовая) ---
  // Решает проблему: "умение работать с ПК", "знание компьютера"
  {
    normalized: 'Computer Literacy',
    synonyms: [
      'computer literacy', 'pc user', 'computer skills', 'уверенный пользователь пк',
      'знание пк', 'умение работать с пк', 'работа на компьютере', 'владение пк',
      'utilizator pc', 'cunostinte pc', 'operare pc', 'computer', 'calculator',
      'navigare internet', 'пользователь интернет'
    ]
  },
  // Microsoft Office уже был, но усилим его для примера 2
  {
    normalized: 'Microsoft Office Suite',
    synonyms: [
      'microsoft office', 'ms office', 'office packet', 'пакет офис',
      'word', 'excel', 'powerpoint', 'ворд', 'эксель', 'офисные программы',
      'programe de oficiu'
    ]
  },

  // --- Трудовая этика и Личные качества ---
  {
    normalized: 'Hardworking',
    synonyms: [
      'hardworking', 'diligence', 'трудолюбие', 'работоспособность', 'усердие',
      'muncitor', 'harnic', 'sarguinta', 'sarguinciozitate', 'lucrator',
      'умение много работать'
    ]
  },
  {
    normalized: 'Motivation', // Для "Желание работать"
    synonyms: [
      'motivation', 'motivated', 'desire to work', 'desire to learn',
      'желание работать', 'желание зарабатывать', 'интерес к работе', 'энтузиазм',
      'dorinta de a lucra', 'dorinta de a invata', 'motivat', 'interes'
    ]
  },
  {
    normalized: 'No Bad Habits', // Для "без вредных привычек"
    synonyms: [
      'no bad habits', 'healthy lifestyle', 'без вредных привычек', 'зож',
      'некурящий', 'fara vicii', 'fara obiceiuri proaste', 'mod de viata sanatos',
      'nepumator'
    ]
  },
  {
    normalized: 'Politeness', // Для "гостеприимная атмосфера"
    synonyms: [
      'polite', 'politeness', 'courtesy', 'вежливость', 'учтивость', 'доброжелательность',
      'amabil', 'amabilitate', 'politete', 'buna crestere', 'улыбчивость'
    ]
  },
  {
    normalized: 'Appearance', // Часто пишут "приятная внешность", "опрятность"
    synonyms: [
      'good looking', 'tidy', 'neat', 'опрятность', 'аккуратный внешний вид',
      'prezentabil', 'aspect fizic placut', 'ingrijit', 'aspect ingrijit'
    ]
  },

  // --- Сервис и Клиенты (Для общепита и продаж) ---
  {
    normalized: 'Customer Service', // Для "достойный уровень сервиса"
    synonyms: [
      'customer service', 'client service', 'сервис', 'обслуживание клиентов',
      'качественный сервис', 'deservire clienti', 'servicii clienti',
      'orientare catre client', 'клиентоориентированность', 'забота о клиенте'
    ]
  },
  {
    normalized: 'Conflict Resolution', // Часто нужно в общепите
    synonyms: [
      'conflict resolution', 'стрессоустойчивость в конфликтах', 'работа с возражениями',
      'решение конфликтов', 'soluționarea conflictelor', 'lucru cu obiectiile',
      'улаживание споров'
    ]
  },
  {
    normalized: 'Staff Organization', // Для "организовывать работу официантов"
    synonyms: [
      'staff organization', 'team coordination', 'организация работы', 'координация смены',
      'распределение задач', 'organizarea lucrului', 'coordonare echipa',
      'контроль персонала'
    ]
  }
];

// ===========================
// ОПЫТ РАБОТЫ (EXPERIENCE)
// ===========================

const EXPERIENCE_SYNONYMS: CategoryEntry[] = [
  {
    normalized: 'no_experience',
    synonyms: [
      // Русский
      'без опыта', 'без опыта работы', 'нет опыта', 'опыт не требуется',
      'не требуется опыт', 'начинающий', 'Junior', 'джуниор', 'trainee',
      // Румынский
      'fără experiență', 'fara experienta', 'fără experienţă',
      'experiență nu este necesară', 'nu este necesara experienta',
      'începător', 'incepator',
      // Английский
      'no experience', 'no experience required', 'entry level', 'entry-level',
      'beginner', 'trainee', 'intern', 'internship',
      // Общие
      '0 лет', '0 ani', '0 years', '0+', 'без стажа'
    ]
  },
  {
    normalized: 'between_1_and_3',
    synonyms: [
      // Русский
      '1-3 года', '1-3 лет', 'от 1 до 3 лет', '1 до 3 года',
      '1-2 года', '2-3 года', 'до 3 лет', 'менее 3 лет',
      'младший специалист', 'джуниор', 'Junior', 'Junior+',
      // Румынский
      '1-3 ani', 'de la 1 la 3 ani', '1 până la 3 ani',
      'până la 3 ani', 'mai puțin de 3 ani', 'mai putin de 3 ani',
      'specialist junior',
      // Английский
      '1-3 years', '1 to 3 years', 'up to 3 years', 'less than 3 years',
      '1-2 years', '2-3 years', 'junior specialist', 'junior developer',
      // Общие
      '1+', '2+', '3 года опыта', '3 ani experiență'
    ]
  },
  {
    normalized: 'between_3_and_6',
    synonyms: [
      // Русский
      '3-6 лет', '3-6 года', 'от 3 до 6 лет', '3 до 6 лет',
      '3-5 лет', '4-6 лет', 'средний специалист', 'middle', 'мидл', 'Middle',
      // Румынский
      '3-6 ani', 'de la 3 la 6 ani', '3 până la 6 ani',
      '3-5 ani', '4-6 ani', 'specialist mediu', 'middle specialist',
      // Английский
      '3-6 years', '3 to 6 years', '3-5 years', '4-6 years',
      'middle specialist', 'middle developer', 'mid-level', 'mid level',
      // Общие
      '3+', '4+', '5+', '6 лет опыта'
    ]
  },
  {
    normalized: 'more_than_6',
    synonyms: [
      // Русский
      'более 6 лет', 'больше 6 лет', 'от 6 лет', 'свыше 6 лет',
      '6+ лет', '6-10 лет', '7+ лет', '10+ лет', 'старший специалист',
      'senior', 'сеньор', 'Senior', 'lead', 'лид', 'Lead',
      'эксперт', 'expert', 'principal',
      // Румынский
      'peste 6 ani', 'mai mult de 6 ani', 'de la 6 ani',
      '6+ ani', '6-10 ani', '7+ ani', '10+ ani',
      'specialist senior', 'senior specialist', 'lider', 'expert',
      // Английский
      'more than 6 years', 'over 6 years', '6+ years', '6-10 years',
      '7+ years', '10+ years', 'senior specialist', 'senior developer',
      'lead developer', 'tech lead', 'principal engineer',
      // Общие
      '6+', '7+', '10+', 'опытный', 'experienced'
    ]
  },
];

// ===========================
// ТИП ЗАНЯТОСТИ (EMPLOYMENT)
// ===========================

const EMPLOYMENT_SYNONYMS: CategoryEntry[] = [
  {
    normalized: 'full',
    synonyms: [
      // Русский
      'полная занятость', 'полная', 'полный день', 'full time', 'full-time',
      'полное рабочее время', 'постоянная работа', 'постоянная занятость',
      // Румынский
      'normă întreagă', 'norma intreaga', 'normă completă', 'norma completa',
      'angajare cu normă întreagă', 'angajare full-time', 'full time',
      'cu normă întreagă',
      // Английский
      'full time', 'full-time', 'fulltime', 'full employment',
      'permanent', 'permanent position',
      // Общие
      '40 часов', '40h', '8 часов в день', 'пн-пт'
    ]
  },
  {
    normalized: 'part',
    synonyms: [
      // Русский
      'частичная занятость', 'частичная', 'не полный день', 'part time',
      'part-time', 'неполное рабочее время', 'по совместительству',
      'подработка', 'временная работа', 'По выходным', 'Неполная занятость',
      // Румынский
      'normă parțială', 'norma partiala', 'angajare cu normă parțială',
      'angajare part-time', 'part time', 'cu normă parțială',
      'jumătate de normă', 'jumatate de norma',
      // Английский
      'part time', 'part-time', 'parttime', 'part employment',
      'temporary', 'temporary position', 'flexible hours',
      // Общие
      '4 часа', '20 часов', 'гибкий график', 'несколько часов в день'
    ]
  },
  {
    normalized: 'project',
    synonyms: [
      // Русский
      'проектная работа', 'по проекту', 'контракт', 'contract', 'проект',
      'работа по контракту', 'фриланс', 'freelance', 'временная работа',
      'срочный контракт', 'проектная деятельность',  'Волонтерство', 'Разовое задание',
      // Румынский
      'muncă pe proiect', 'munca pe proiect', 'contract pe proiect',
      'contract temporar', 'freelance', 'freelancer', 'pe bază de contract',
      'muncă temporară', 'munca temporara',
      // Английский
      'project work', 'project-based', 'contract work', 'contract',
      'freelance', 'freelancer', 'temporary contract', 'fixed-term contract',
      'gig', 'contractor',
      // Общие
      'по договору', 'договор подряда', 'временно'
    ]
  },
  {
    normalized: 'probation',
    synonyms: [
      // Русский
      'стажировка', 'стажёр', 'стажер', 'практика', 'интернатура',
      'internship', 'intern', 'испытательный срок', 'практикант',
      'ученик', 'обучение', 'trainee',
      // Румынский
      'stagiu', 'stagiu de practică', 'stagiu profesional', 'stagiar',
      'intern', 'internship', 'perioadă de probă', 'perioada de proba',
      'practică', 'practica profesională', 'practica profesionala',
      // Английский
      'internship', 'intern', 'trainee', 'traineeship', 'probation',
      'probation period', 'apprentice', 'apprenticeship', 'co-op',
      'work experience', 'placement',
      // Общие
      'обучающая программа', 'студент', 'выпускник'
    ]
  },
];

// ===========================
// ВАЛЮТЫ (CURRENCY)
// ===========================

const CURRENCY_SYNONYMS: CategoryEntry[] = [
  {
    normalized: 'MDL',
    synonyms: [
      'MDL', 'mdl', 'Lei', 'lei', 'леев', 'леи', 'лей',
      'молдавский лей', 'Moldovan Leu', 'moldovan leu',
      'эм ди эль'
    ]
  },
  {
    normalized: 'USD',
    synonyms: [
      'USD', 'usd', '$', 'dollar', 'Dollar', 'доллар', 'долларов',
      'US Dollar', 'US dollar', 'us dollar', 'американский доллар',
      'USD $', '$ USD', 'ю эс ди'
    ]
  },
  {
    normalized: 'EUR',
    synonyms: [
      'EUR', 'eur', '€', 'euro', 'Euro', 'евро',
      'European Euro', 'европейское евро', 'е у р'
    ]
  },
  {
    normalized: 'RUB',
    synonyms: [
      'RUB', 'rub', '₽', 'рубль', 'рублей', 'рублей', 'руб',
      'Russian Ruble', 'russian ruble', 'российский рубль',
      'эр у бэ', 'RUR'
    ]
  },
  {
    normalized: 'GBP',
    synonyms: [
      'GBP', 'gbp', '£', 'pound', 'Pound', 'фунт', 'фунтов',
      'British Pound', 'british pound', 'британский фунт',
      'фунт стерлингов', 'джи би пи'
    ]
  },
  {
    normalized: 'UAH',
    synonyms: [
      'UAH', 'uah', '₴', 'гривна', 'гривен', 'гривень',
      'Ukrainian Hryvnia', 'ukrainian hryvnia', 'украинская гривна',
      'у а эйч', 'грн'
    ]
  },
  {
    normalized: 'RON',
    synonyms: [
      'RON', 'ron', 'leu', 'Leu', 'румынский лей', 'леев',
      'Romanian Leu', 'romanian leu', 'эр оу эн'
    ]
  },
  {
    normalized: 'CHF',
    synonyms: [
      'CHF', 'chf', 'franc', 'Franc', 'франк', 'франков',
      'Swiss Franc', 'swiss franc', 'швейцарский франк',
      'си эйч эф'
    ]
  },
  {
  normalized: 'BYN',
  synonyms: [
    'BYN', 'byn', 'Br', 'br', 'бел руб', 'бел. руб.', 'белорусский рубль',
    'белорусские рубли', 'бел рубля', 'Belarusian Ruble', 'belarusian ruble',
    'blr', 'BLR', 'р бел', 'р. бел.', 'р.бел.', 'руб бел', 'руб. бел.',
    'бел', 'беларусь', 'Belarus', 'Беларусь'
  ]
},
];

// ===========================
// ГРАФИК РАБОТЫ (SCHEDULE)
// ===========================

const SCHEDULE_SYNONYMS: CategoryEntry[] = [
  {
    normalized: 'remote',
    synonyms: [
      // Русский
      'удалённая работа', 'удаленная работа', 'удаленно', 'удалённо',
      'remote', 'дистанционно', 'дистанционная работа', 'из дома',
      'работа из дома', 'home office', 'хоум офис', 'на удалёнке',
      'на удаленке', 'полностью удаленно',
      // Румынский
      'la distanță', 'la distanta', 'muncă la distanță', 'munca la distanta',
      'remote', 'de acasă', 'de acasa', 'muncă de acasă', 'munca de acasa',
      'home office', 'telemuncă', 'telemunca', 'complet la distanță',
      'complet la distanta',
      // Английский
      'remote', 'remote work', 'work from home', 'WFH', 'telecommute',
      'telecommuting', 'home office', 'home-based', 'fully remote',
      'remote-first', 'distributed', 
      // Общие
      'онлайн', 'online'
    ]
  },
  {
    normalized: 'office',
    synonyms: [
      // Русский
      'офис', 'в офисе', 'работа в офисе', 'офисная работа',
      'на месте', 'стационарно', 'on-site', 'он-сайт', 'в здании компании',
      'По месту нахождения работодателя', 'На постоянной основе', 'На территории работодателя',
      // Румынский
      'birou', 'la birou', 'muncă la birou', 'munca la birou',
      'la sediu', 'sediu', 'la fața locului', 'la fata locului',
      'on-site', 'la locul de muncă', 'la locul de munca',
      // Английский
      'office', 'in office', 'office work', 'on-site', 'onsite',
      'at office', 'workplace', 'in-person', 'on location', 
      // Общие
      'стационар', 'централизовано'
    ]
  },
  {
    normalized: 'hybrid',
    synonyms: [
      // Русский
      'гибридный график', 'гибридная работа', 'гибрид', 'hybrid',
      'частично удаленно', 'офис + удаленка', 'смешанный график',
      'комбинированный график', 'гибкий график', 'flexible',
      // Румынский
      'hibrid', 'hybrid', 'muncă hibridă', 'munca hibrida',
      'program hibrid', 'mixt', 'birou și de acasă', 'birou si de acasa',
      'parțial la distanță', 'partial la distanta', 'flexibil',
      // Английский
      'hybrid', 'hybrid work', 'hybrid schedule', 'flexible',
      'flexible schedule', 'mixed', 'office + remote', 'part remote',
      'partially remote', 'flex',
      // Общие
      '2-3 дня в офисе', '2-3 zile la birou', '2-3 days office'
    ]
  },
  {
    normalized: 'flexible',
    synonyms: [
      // Русский
      'гибкий', 'гибкий график', 'свободный график', 'flexible',
      'по договоренности', 'обсуждается', 'индивидуально',
      'плавающий график', 'свободное расписание',
      // Румынский
      'flexibil', 'program flexibil', 'orar flexibil',
      'după înțelegere', 'dupa intelegere', 'negociabil', 'individual',
      // Английский
      'flexible', 'flexible schedule', 'flexible hours', 'negotiable',
      'by agreement', 'custom schedule', 'adjustable',
      // Общие
      'договорной', 'свободный'
    ]
  },
  {
    normalized: 'shift',
    synonyms: [
      // Русский
      'сменный график', 'посменно', 'смены', 'shift', 'график смен',
      '2/2', '5/2', 'сутки через трое', 'вахта', 'вахтовый метод', 'В полевых условиях',
      // Румынский
      'program pe schimburi', 'în schimburi', 'in schimburi',
      'schimburi', 'tură', 'tura', 'rotație', 'rotatie',
      '2/2', '5/2',
      // Английский
      'shift', 'shift work', 'rotating shift', 'rotation',
      '2/2', '5/2', 'day shift', 'night shift', 'swing shift',
      // Общие
      'ночные смены', 'дневные смены'
    ]
  },
];

// ===========================
// Вспомогательные функции сопоставления
// ===========================

/**
 * Находит подходящие навыки из входной строки
 * @param input Входная строка (например, "нужен JS и Python")
 * @param threshold Порог схожести (0.0 - 1.0, меньше = строже)
 * @returns Массив нормализованных навыков
 */
export function findMatchingSkills(input: string, threshold: number = 0.4): string[] {
  if (!input) return [];
  
  const fuse = new Fuse(SKILL_SYNONYMS, {
    keys: ['synonyms'],
    includeScore: true,
    threshold: threshold,
    ignoreLocation: true,
    findAllMatches: true,
  });

  const lowerInput = input.toLowerCase();
  const results = fuse.search(lowerInput);
  
  // Возвращаем уникальные нормализованные имена для результатов, превышающих порог
  const uniqueSkills = new Set(
    results
      .filter(result => result.score !== undefined && result.score <= threshold)
      .map(result => result.item.normalized)
  );
  
  return Array.from(uniqueSkills);
}

/**
 * Находит подходящую категорию из списка синонимов
 * @param input Входная строка
 * @param synonymsList Список категорий с синонимами
 * @param threshold Порог схожести
 * @returns Нормализованное значение категории или undefined
 */
export function findMatchingCategory(
  input: string,
  synonymsList: CategoryEntry[],
  threshold: number = 0.3
): string | undefined {
  if (!input) return undefined;
  
  const fuse = new Fuse(synonymsList, {
    keys: ['synonyms'],
    includeScore: true,
    threshold: threshold,
    ignoreLocation: true,
  });

  const lowerInput = input.toLowerCase();
  const results = fuse.search(lowerInput);
  
  const bestMatch = results.find(
    result => result.score !== undefined && result.score <= threshold
  );
  
  return bestMatch ? bestMatch.item.normalized : undefined;
}

/**
 * Находит подходящий уровень опыта
 */
export function findMatchingExperience(input: string, threshold: number = 0.3): string | undefined {
  return findMatchingCategory(input, EXPERIENCE_SYNONYMS, threshold);
}

/**
 * Находит подходящий тип занятости
 */
export function findMatchingEmployment(input: string, threshold: number = 0.3): string | undefined {
  return findMatchingCategory(input, EMPLOYMENT_SYNONYMS, threshold);
}

/**
 * Находит подходящую валюту
 */
export function findMatchingCurrency(input: string): string | undefined {
  if (!input) return undefined;
  const lowerInput = input.toLowerCase();
  
  for (const currency of CURRENCY_SYNONYMS) {
    for (const synonym of currency.synonyms) {
      const lowerSynonym = synonym.toLowerCase();
      if (lowerInput.includes(lowerSynonym)) {
        return currency.normalized;
      }
    }
  }
  
  return undefined;
}

/**
 * Находит подходящий график работы
 */
export function findMatchingSchedule(input: string, threshold: number = 0.3): string | undefined {
  return findMatchingCategory(input, SCHEDULE_SYNONYMS, threshold);
}

/**
 * Извлекает навыки из текста описания вакансии
 * Использует поиск целых слов (word boundaries) для точного сопоставления
 * @param description Текст описания вакансии
 * @returns Массив нормализованных навыков
 */
// Исправляем ТОЛЬКО эту функцию - она используется везде
export function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  const lowerDesc = description.toLowerCase();
  const matchedSkills = new Set<string>();

  SKILL_SYNONYMS.forEach(skill => {
    const foundSynonym = skill.synonyms.some(synonym => {
      const lowerSynonym = synonym.toLowerCase();
      // Исправление: безопасные границы для кириллицы
      const escaped = lowerSynonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Границы: начало строки ИЛИ пробел/пунктуация, затем слово, затем конец ИЛИ пробел/пунктуация
      const regex = new RegExp(
        `(?:^|\\s|[,.;:!?()«»"'\\[\\]])${escaped}(?:$|\\s|[,.;:!?()«»"'\\[\\]])`,
        'i'
      );
      return regex.test(lowerDesc);
    });

    if (foundSynonym) {
      matchedSkills.add(skill.normalized);
    }
  });

  return Array.from(matchedSkills);
}
/**
 * Извлекает все доступные категории опыта (для справки)
 */
export function getAvailableExperienceLevels(): string[] {
  return EXPERIENCE_SYNONYMS.map(entry => entry.normalized);
}

/**
 * Извлекает все доступные типы занятости (для справки)
 */
export function getAvailableEmploymentTypes(): string[] {
  return EMPLOYMENT_SYNONYMS.map(entry => entry.normalized);
}

/**
 * Извлекает все доступные валюты (для справки)
 */
export function getAvailableCurrencies(): string[] {
  return CURRENCY_SYNONYMS.map(entry => entry.normalized);
}

/**
 * Извлекает все доступные графики работы (для справки)
 */
export function getAvailableScheduleTypes(): string[] {
  return SCHEDULE_SYNONYMS.map(entry => entry.normalized);
}

/**
 * Извлекает все доступные навыки (для справки)
 */
export function getAvailableSkills(): string[] {
  return SKILL_SYNONYMS.map(entry => entry.normalized);
}
