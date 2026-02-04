// Файл: canonical-professions.ts (полностью обновленный)

export interface CanonicalProfession {
  canonicalName: string;
  category?: string;
  synonyms: string[];
  sourceMappings: {
    'rabota.md'?: string[];
    '999.md'?: string[];
    'makler.md'?: string[];
  };
}

export const CANONICAL_PROFESSIONS: CanonicalProfession[] = [
  // === ПРОДАЖИ ===
  {
    canonicalName: "Менеджер по продажам",
    category: "Продажи",
    synonyms: ["менеджер", "управляющий", "manager", "sales manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по продажам"],
      "999.md": ["Менеджер по продажам", "Торговые представители", "Продажи по телефону (телемаркетинг)"],
      "makler.md": ["Менеджеры по работе с клиентами"]
    }
  },
  {
    canonicalName: "Менеджер по работе с клиентами",
    category: "Продажи",
    synonyms: ["управляющий", "manager", "customer service manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по работе с клиентами"],
      "999.md": ["Менеджер по работе с клиентами"],
      "makler.md": ["Менеджеры по работе с клиентами"]
    }
  },
  {
    canonicalName: "Продавец",
    category: "Продажи",
    synonyms: ["кассир", "консультант", "salesperson", "seller"],
    sourceMappings: {
      "rabota.md": ["Продавец", "Продавец консультант", "Реализатор"],
      "999.md": ["Продавцы, кассиры"],
      "makler.md": ["Продавцы, кассиры"]
    }
  },
  {
    canonicalName: "Кассир",
    category: "Продажи",
    synonyms: ["операционист", "teller", "cashier"],
    sourceMappings: {
      "rabota.md": ["Кассир", "Теллер"],
      "999.md": ["Продавцы, кассиры", "Кассир-операционист"],
      "makler.md": ["Продавцы, кассиры"]
    }
  },
  {
    canonicalName: "Торговый представитель",
    category: "Продажи",
    synonyms: ["агент", "коммивояжер", "sales representative"],
    sourceMappings: {
      "rabota.md": ["Торговый представитель", "Коммерческий агент", "Торговый агент"],
      "999.md": ["Торговые представители"]
    }
  },
  {
    canonicalName: "Агент по продажам",
    category: "Продажи",
    synonyms: ["агент", "представитель", "sales agent"],
    sourceMappings: {
      "rabota.md": ["Агент по продажам", "Агент"],
      "999.md": ["Агент по недвижимости"]
    }
  },

  // === ИТ ===
  {
    canonicalName: "Программист",
    category: "ИТ",
    synonyms: ["разработчик", "developer", "кодер", "coder", "айтишник"],
    sourceMappings: {
      "rabota.md": ["Программист", "Веб-программист", "Android Developer", "PHP Developer", "1C разработчик", "Backend", "C#", "Full Stack"],
      "999.md": ["Программист", "Java-разработчик", "Программист, разработчик"],
      "makler.md": ["Программисты"]
    }
  },
  {
    canonicalName: "DevOps-инженер",
    category: "ИТ",
    synonyms: ["девопс", "инженер DevOps", "системный инженер"],
    sourceMappings: {
      "999.md": ["DevOps-инженер"],
      "rabota.md": ["DevOps-инженер"]
    }
  },
  {
    canonicalName: "Верстальщик",
    category: "ИТ",
    synonyms: ["frontend разработчик", "html-верстальщик", "верстка"],
    sourceMappings: {
      "rabota.md": ["Верстальщик"]
    }
  },
  {
    canonicalName: "Системный администратор",
    category: "ИТ",
    synonyms: ["сисадмин", "админ", "system administrator", "sysadmin"],
    sourceMappings: {
      "rabota.md": ["Системный администратор"],
      "makler.md": ["Системные администраторы"]
    }
  },
  {
    canonicalName: "Тестировщик",
    category: "ИТ",
    synonyms: ["QA", "инженер по тестированию", "тестер", "quality assurance"],
    sourceMappings: {
      "rabota.md": ["Тестировщик", "Тестер"],
      "999.md": ["Тестировщик"],
      "makler.md": ["Тестировщики, QA"]
    }
  },
  {
    canonicalName: "Специалист по информационной безопасности",
    category: "ИТ",
    synonyms: ["инфобезопасность", "кибербезопасность", "security specialist"],
    sourceMappings: {
      "999.md": ["Специалист информационной безопасности", "Специалист по информационной безопасности"]
    }
  },

  // === ОБСЛУЖИВАНИЕ / СФЕРА УСЛУГ ===
  {
    canonicalName: "Официант",
    category: "Обслуживание",
    synonyms: ["бармен", "бариста", "официантка", "waiter", "waitress"],
    sourceMappings: {
      "rabota.md": ["Официант", "Бармен"],
      "999.md": ["Официант, бармен, бариста"],
      "makler.md": ["Бармены, официанты"]
    }
  },
  {
    canonicalName: "Повар",
    category: "Обслуживание",
    synonyms: ["кулинар", "шеф-повар", "повариха", "cook", "chef"],
    sourceMappings: {
      "rabota.md": ["Повар", "Шеф-повар", "Сушист", "Кондитер"],
      "999.md": ["Повар, пекарь, кондитер", "Шеф-повар"],
      "makler.md": ["Повара, работники кухни"]
    }
  },
  {
    canonicalName: "Уборщица",
    category: "Обслуживание",
    synonyms: ["клинер", "уборщик", "домработница", "cleaner", "housekeeper"],
    sourceMappings: {
      "rabota.md": ["Уборщица", "Домработница"],
      "999.md": ["Уборщица", "Клининг, Домработник, Домработница", "Персонал уборки"],
      "makler.md": ["Уборщицы", "Домработницы"]
    }
  },
  {
    canonicalName: "Парикмахер",
    category: "Обслуживание",
    synonyms: ["стилист", "колорист", "барбер", "hairdresser", "hair stylist"],
    sourceMappings: {
      "rabota.md": ["Парикмахер", "Стилист", "Колорист"],
      "999.md": ["Парикмахер", "Парикмахер, стилист, колорист, барбер"],
      "makler.md": ["Стилисты, парикмахеры"]
    }
  },
  {
    canonicalName: "Визажист",
    category: "Обслуживание",
    synonyms: ["косметолог", "макияж", "makeup artist", "cosmetologist"],
    sourceMappings: {
      "rabota.md": ["Визажист", "Косметолог"],
      "999.md": ["Визажист, косметолог"],
      "makler.md": ["Визажисты, косметологи"]
    }
  },

  // === ПРОИЗВОДСТВО ===
  {
    canonicalName: "Слесарь",
    category: "Производство",
    synonyms: ["сантехник", "механик", "ремонтник", "locksmith", "plumber"],
    sourceMappings: {
      "rabota.md": ["Слесарь", "Производственный слесарь", "Слесарь по ремонту оборудования", "Автослесарь", "Механик"],
      "999.md": ["Производственный слесарь, сантехник", "Слесарь, сантехник", "Мастер по ремонту оборудования, техники"],
      "makler.md": ["Сантехники", "Механики, автослесари"]
    }
  },
  {
    canonicalName: "Маляр",
    category: "Производство",
    synonyms: ["штукатур", "отделочник", "маляр-штукатур", "painter", "plasterer"],
    sourceMappings: {
      "rabota.md": ["Маляр"],
      "999.md": ["Маляр, штукатур"],
      "makler.md": ["Маляр"]
    }
  },
  {
    canonicalName: "Сварщик",
    category: "Производство",
    synonyms: ["электросварщик", "сварка", "welder"],
    sourceMappings: {
      "rabota.md": ["Сварщик", "Электросварщик"],
      "999.md": ["Сварщик"]
    }
  },
  {
    canonicalName: "Водитель",
    category: "Производство",
    synonyms: ["шофер", "водила", "driver", "chauffeur"],
    sourceMappings: {
      "rabota.md": ["Водитель", "Личный водитель", "Шофер", "Таксист"],
      "999.md": ["Водитель"],
      "makler.md": ["Водители"]
    }
  },
  {
    canonicalName: "Грузчик",
    category: "Производство",
    synonyms: ["погрузчик", "разнорабочий", "loader", "porter"],
    sourceMappings: {
      "rabota.md": ["Грузчик"],
      "999.md": ["Грузчик"],
      "makler.md": ["Грузчики"]
    }
  },

  // === ОБРАЗОВАНИЕ ===
  {
    canonicalName: "Учитель",
    category: "Образование",
    synonyms: ["преподаватель", "педагог", "учительница", "teacher", "educator"],
    sourceMappings: {
      "rabota.md": ["Учитель", "Преподаватель", "Учитель начальных классов", "Старший преподаватель", "Репетитор"],
      "999.md": ["Учитель начальных классов", "Преподаватель, репетитор"],
      "makler.md": ["Преподаватели, педагоги"]
    }
  },
  {
    canonicalName: "Воспитатель",
    category: "Образование",
    synonyms: ["няня", "гувернантка", "воспитательница", "educator", "nanny"],
    sourceMappings: {
      "rabota.md": ["Воспитатель", "Няня"],
      "999.md": ["Воспитатель, няня"],
      "makler.md": ["Воспитатели", "Няни, гувернантки", "Помощники воспитателей"]
    }
  },
  {
    canonicalName: "Репетитор",
    category: "Образование",
    synonyms: ["частный преподаватель", "тьютор", "tutor"],
    sourceMappings: {
      "rabota.md": ["Репетитор"],
      "999.md": ["Преподаватель, репетитор"]
    }
  },

  // === МЕДИЦИНА ===
  {
    canonicalName: "Врач",
    category: "Медицина",
    synonyms: ["доктор", "медик", "терапевт", "doctor", "physician"],
    sourceMappings: {
      "rabota.md": ["Врач", "Доктор", "Медик", "Гинеколог"],
      "999.md": ["Врач"],
      "makler.md": ["Врачи"]
    }
  },
  {
    canonicalName: "Медсестра",
    category: "Медицина",
    synonyms: ["медбрат", "медицинская сестра", "nurse"],
    sourceMappings: {
      "rabota.md": ["Медсестра"],
      "999.md": ["Медицинская сестра, медицинский брат"]
    }
  },
  {
    canonicalName: "Массажист",
    category: "Медицина",
    synonyms: ["спортивный массажист", "массажистка", "masseur", "masseuse"],
    sourceMappings: {
      "rabota.md": ["Массажист"],
      "999.md": ["Массажист, спортивный массажист"],
      "makler.md": ["Массажисты"]
    }
  },
  {
    canonicalName: "Фармацевт",
    category: "Медицина",
    synonyms: ["провизор", "аптекарь", "pharmacist"],
    sourceMappings: {
      "rabota.md": ["Фармацевт"],
      "999.md": ["Фармацевт"],
      "makler.md": ["Фармацевты"]
    }
  },

  // === ФИНАНСЫ ===
  {
    canonicalName: "Бухгалтер",
    category: "Финансы",
    synonyms: ["счетовод", "accountant", "главный бухгалтер", "бухгалтерия"],
    sourceMappings: {
      "rabota.md": ["Бухгалтер", "Главный бухгалтер", "Помощник бухгалтера", "Второй бухгалтер"],
      "999.md": ["Бухгалтер"],
      "makler.md": ["Бухгалтеры"]
    }
  },
  {
    canonicalName: "Экономист",
    category: "Финансы",
    synonyms: ["экономист-аналитик", "economist"],
    sourceMappings: {
      "rabota.md": ["Экономист"],
      "999.md": ["Экономист", "Финансовый аналитик"]
    }
  },
  {
    canonicalName: "Финансист",
    category: "Финансы",
    synonyms: ["финансовый аналитик", "финансовый консультант", "financier"],
    sourceMappings: {
      "rabota.md": ["Финансист"],
      "999.md": ["Финансовый аналитик", "Финансовый консультант"]
    }
  },
  {
    canonicalName: "Брокер",
    category: "Финансы",
    synonyms: ["маклер", "риэлтор", "посредник", "broker"],
    sourceMappings: {
      "rabota.md": ["Брокер", "Маклер", "Риэлтор"],
      "999.md": ["Брокер по недвижимости"]
    }
  },

  // === ЛОГИСТИКА ===
  {
    canonicalName: "Логист",
    category: "Логистика",
    synonyms: ["логистик", "менеджер по логистике", "logistics manager"],
    sourceMappings: {
      "rabota.md": ["Логист", "Логист-аналитик", "Менеджер по логистике"],
      "999.md": ["Менеджер по логистике", "Руководитель отдела логистики"],
      "makler.md": ["Менеджеры перевозок"]
    }
  },
  {
    canonicalName: "Экспедитор",
    category: "Логистика",
    synonyms: ["экспедироващик", "доставщик", "expeditor"],
    sourceMappings: {
      "rabota.md": ["Экспедитор"],
      "999.md": ["Экспедитор"],
      "makler.md": ["Экспедиторы"]
    }
  },
  {
    canonicalName: "Курьер",
    category: "Логистика",
    synonyms: ["доставщик", "курьерская служба", "courier"],
    sourceMappings: {
      "rabota.md": ["Курьер", "Почтальон"],
      "999.md": ["Курьер"]
    }
  },

  // === СТРОИТЕЛЬСТВО ===
  {
    canonicalName: "Строитель",
    category: "Строительство",
    synonyms: ["строительный рабочий", "construction worker", "builder"],
    sourceMappings: {
      "rabota.md": ["Строитель", "Работник на производство", "Разнорабочий"],
      "999.md": ["Рабочие на производство", "Разнорабочий"],
      "makler.md": ["Строитель", "Разнорабочие"]
    }
  },
  {
    canonicalName: "Инженер-строитель",
    category: "Строительство",
    synonyms: ["инженер ПТО", "инженер-проектировщик", "civil engineer"],
    sourceMappings: {
      "rabota.md": ["Инженер строитель", "Инженер проектировщик", "Инженер конструктор"],
      "999.md": ["Инженер ПТО, инженер-сметчик", "Проектировщик инженерных систем"]
    }
  },
  {
    canonicalName: "Прораб",
    category: "Строительство",
    synonyms: ["мастер", "бригадир", "supervisor", "foreman"],
    sourceMappings: {
      "rabota.md": ["Прораб", "Бригадир"],
      "999.md": ["Прораб, мастер СМР"],
      "makler.md": ["Прорабы"]
    }
  },

  // === КУЛЬТУРА И ТВОРЧЕСТВО ===
  {
    canonicalName: "Дизайнер",
    category: "Культура и творчество",
    synonyms: ["художник", "иллюстратор", "графический дизайнер", "designer"],
    sourceMappings: {
      "rabota.md": ["Дизайнер", "Веб-дизайнер", "Графический дизайнер", "Иллюстратор", "Художник", "3Д Художник", "2Д Художник"],
      "999.md": ["Дизайнер, художник", "Ландшафтный дизайнер", "Гейм-дизайнер", "Дизайнер интерьера", "3D графика", "2D графика"],
      "makler.md": ["Дизайнеры, художники", "Дизайнеры (UX, web)"]
    }
  },
  {
    canonicalName: "Фотограф",
    category: "Культура и творчество",
    synonyms: ["ретушер", "фотохудожник", "photographer"],
    sourceMappings: {
      "rabota.md": ["Фотограф", "Фотомодель"],
      "999.md": ["Фотограф, ретушер"],
      "makler.md": ["Фотографы, операторы"]
    }
  },
  {
    canonicalName: "Журналист",
    category: "Культура и творчество",
    synonyms: ["корреспондент", "репортер", "журналистика", "journalist"],
    sourceMappings: {
      "rabota.md": ["Журналист", "Корреспондент", "Репортер"],
      "999.md": ["Журналист, корреспондент"],
      "makler.md": ["Журналисты"]
    }
  },

  // === АДМИНИСТРАТИВНЫЕ ===
  {
    canonicalName: "Администратор",
    category: "Административная",
    synonyms: ["админ", "управляющий", "административный работник", "administrator"],
    sourceMappings: {
      "rabota.md": ["Администратор", "Администратор торгового зала", "Администратор рецепции", "Управляющий"],
      "999.md": ["Администратор", "Администратор салона красоты", "Администратор гостиницы", "Администратор салона, фитнес клуба"],
      "makler.md": ["Администраторы (Салоны)", "Администраторы (Рестораны)", "Администраторы (Туризм)"]
    }
  },
  {
    canonicalName: "Секретарь",
    category: "Административная",
    synonyms: ["референт", "офис-менеджер", "секретарша", "secretary"],
    sourceMappings: {
      "rabota.md": ["Секретарь", "Секретарь-референт", "Секретарь офиса", "Офис-менеджер"],
      "999.md": ["Офис-менеджер, секретарь, рецепционист"],
      "makler.md": ["Офис-менеджеры, секретари"]
    }
  },
  {
    canonicalName: "Менеджер",
    category: "Административная",
    synonyms: ["управленец", "руководитель", "manager", "supervisor"],
    sourceMappings: {
      "rabota.md": ["Менеджер", "Начальник", "Директор", "Директор предприятия", "Генеральный директор", "Заместитель"],
      "999.md": ["Руководитель группы/отдела", "Руководитель проекта", "Директор по информационным технологиям", "Технический директор (CTO)"],
      "makler.md": ["Руководители подразделений", "Руководители проектов", "Директора"]
    }
  },

  // === ДРУГИЕ КАТЕГОРИИ ===
  {
    canonicalName: "Юрист",
    category: "Юриспруденция",
    synonyms: ["юрисконсульт", "адвокат", "правовед", "lawyer", "attorney"],
    sourceMappings: {
      "rabota.md": ["Юрист", "Юрисконсульт", "Адвокат", "Нотариус"],
      "999.md": ["Юрист, юрисконсульт"],
      "makler.md": ["Юристы", "Помощники нотариуса"]
    }
  },
  {
    canonicalName: "Переводчик",
    category: "Образование",
    synonyms: ["интерпретатор", "переводовед", "translator", "interpreter"],
    sourceMappings: {
      "rabota.md": ["Переводчик"],
      "makler.md": ["Переводчики"]
    }
  },
  {
    canonicalName: "Контент-менеджер",
    category: "Маркетинг",
    synonyms: ["SMM-менеджер", "контент-специалист", "content manager", "smm specialist"],
    sourceMappings: {
      "rabota.md": ["Контент менеджер"],
      "999.md": ["SMM-менеджер, контент-менеджер"],
      "makler.md": ["SMM"]
    }
  },
  {
    canonicalName: "Маркетолог",
    category: "Маркетинг",
    synonyms: ["маркетинг-специалист", "marketer", "специалист по маркетингу"],
    sourceMappings: {
      "rabota.md": ["Маркетолог", "Менеджер по маркетингу"],
      "999.md": ["Менеджер по маркетингу, интернет-маркетолог", "Маркетолог-аналитик"],
      "makler.md": ["Маркетологи"]
    }
  },
  {
    canonicalName: "Бортпроводник",
    category: "Обслуживание",
    synonyms: ["стюард", "стюардесса", "flight attendant"],
    sourceMappings: {
      "rabota.md": ["Бортпроводник"]
    }
  },
  {
    canonicalName: "Бариста",
    category: "Обслуживание",
    synonyms: ["кофевар", "бармен-бариста", "barista"],
    sourceMappings: {
      "rabota.md": ["Бариста"],
      "999.md": ["Официант, бармен, бариста"]
    }
  },
  {
    canonicalName: "Вышивальщица",
    category: "Другое",
    synonyms: ["вышивальщик", "embroidery specialist"],
    sourceMappings: {
      "rabota.md": ["Вышивальщица"]
    }
  },
  {
    canonicalName: "Теллер",
    category: "Финансы",
    synonyms: ["кассир-операционист", "банковский кассир", "bank teller"],
    sourceMappings: {
      "999.md": ["Кассир"],
      "rabota.md": ["Теллер"]
    }
  },
  {
    canonicalName: "Категорийный оператор",
    category: "Логистика",
    synonyms: ["такелажник", "грузчик-такелажник", "rigger"],
    sourceMappings: {
      "999.md": ["Такелажник"]
    }
  },
  {
    canonicalName: "Оператор станков",
    category: "Производство",
    synonyms: ["станочник", "оператор ЧПУ", "machine operator"],
    sourceMappings: {
      "999.md": ["Оператор станков"],
      "rabota.md": ["Оператор станков"]
    }
  },
  {
    canonicalName: "Приемщик грузов",
    category: "Логистика",
    synonyms: ["приёмщик", "грузоприёмщик", "cargo receiver"],
    sourceMappings: {
      "999.md": ["Приёмщик грузов"]
    }
  },
  {
    canonicalName: "Инженер по наладке оборудования",
    category: "Производство",
    synonyms: ["инженер-наладчик", "commissioning engineer"],
    sourceMappings: {
      "999.md": ["Инженер по наладке оборудования"]
    }
  },
  {
    canonicalName: "Слесарь по ремонту оборудования",
    category: "Производство",
    synonyms: ["ремонтник оборудования", "equipment repair technician"],
    sourceMappings: {
      "999.md": ["Слесарь по ремонту оборудования"]
    }
  },
  {
    canonicalName: "Специалист по телекоммуникациям",
    category: "ИТ",
    synonyms: ["телеком-специалист", "связист", "telecommunications specialist"],
    sourceMappings: {
      "999.md": ["Специалист по телекоммуникациям"],
      "makler.md": ["Инженеры (Связь)"]
    }
  },
  {
    canonicalName: "Составитель статистики",
    category: "Административная",
    synonyms: ["статистик", "аналитик данных", "statistician"],
    sourceMappings: {
      "999.md": ["Составитель статистики"]
    }
  },
  {
    canonicalName: "Специалист по антитеррору",
    category: "Безопасность",
    synonyms: ["антитеррор", "специалист по безопасности", "counter-terrorism specialist"],
    sourceMappings: {
      "999.md": ["Специалист по антитеррору"]
    }
  },
  {
    canonicalName: "Оператор call-центра",
    category: "Продажи",
    synonyms: ["оператор колл-центра", "телефонный оператор", "call center operator"],
    sourceMappings: {
      "999.md": ["Оператор call-центра"],
      "rabota.md": ["Оператор Колл-центра"]
    }
  },
  {
    canonicalName: "Java-разработчик",
    category: "ИТ",
    synonyms: ["Java программист", "Java developer"],
    sourceMappings: {
      "999.md": ["Java-разработчик"]
    }
  },
  {
    canonicalName: "Администратор гостиницы",
    category: "Гостиницы и туризм",
    synonyms: ["администратор отеля", "гостиничный администратор", "hotel administrator"],
    sourceMappings: {
      "999.md": ["Администратор гостиницы"]
    }
  },
  {
    canonicalName: "Учитель начальных классов",
    category: "Образование",
    synonyms: ["учитель младших классов", "primary school teacher"],
    sourceMappings: {
      "999.md": ["Учитель начальных классов"]
    }
  },
  {
    canonicalName: "Повременная уборщица",
    category: "Обслуживание",
    synonyms: ["уборщица почасово", "part-time cleaner"],
    sourceMappings: {
      "999.md": ["Уборщица"]
    }
  },
  {
    canonicalName: "Администратор салона красоты",
    category: "Сфера услуг",
    synonyms: ["админ салона", "beauty salon administrator"],
    sourceMappings: {
      "999.md": ["Администратор салона красоты"]
    }
  },
  {
    canonicalName: "Мастер по наращиванию ресниц",
    category: "Обслуживание",
    synonyms: ["лешмейкер", "lash specialist"],
    sourceMappings: {
      "999.md": ["Мастер по наращиванию ресниц"]
    }
  },
  {
    canonicalName: "Бренд-менеджер",
    category: "Маркетинг",
    synonyms: ["brand manager"],
    sourceMappings: {
      "999.md": ["Бренд-менеджер"],
      "rabota.md": ["Бренд менеджер"]
    }
  },
  {
    canonicalName: "Гид",
    category: "Гостиницы и туризм",
    synonyms: ["экскурсовод", "тургид", "guide", "tour guide"],
    sourceMappings: {
      "rabota.md": ["Гид"],
      "999.md": ["Гид, экскурсовод"],
      "makler.md": ["Гиды/экскурсоводы"]
    }
  },
  {
    canonicalName: "Нутрициолог",
    category: "Медицина",
    synonyms: ["диетолог", "нутриционист", "nutritionist"],
    sourceMappings: {
      "999.md": ["Нутрициолог, диетолог"]
    }
  },
  {
    canonicalName: "Оценщик",
    category: "Финансы",
    synonyms: ["андеррайтер", "оценщик имущества", "appraiser", "underwriter"],
    sourceMappings: {
      "999.md": ["Оценщик, андеррайтер"]
    }
  },
  {
    canonicalName: "Менеджер по маркетингу",
    category: "Маркетинг",
    synonyms: ["интернет-маркетолог", "маркетинг-менеджер", "marketing manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по маркетингу"],
      "999.md": ["Менеджер по маркетингу, интернет-маркетолог"]
    }
  },
  {
    canonicalName: "Сервисный инженер",
    category: "Производство",
    synonyms: ["инженер-механик", "service engineer"],
    sourceMappings: {
      "999.md": ["Сервисный инженер, инженер-механик"]
    }
  },
  {
    canonicalName: "Инженер-технолог",
    category: "Производство",
    synonyms: ["технолог", "production engineer"],
    sourceMappings: {
      "999.md": ["Инженеры, технологи производства"],
      "makler.md": ["Инженеры-технологи"]
    }
  },
  {
    canonicalName: "Теле- и радиоведущие",
    category: "Культура и творчество",
    synonyms: ["телеведущий", "радиоведущий", "TV and radio presenter"],
    sourceMappings: {
      "makler.md": ["Теле- и радиоведущие", "Ведущие, актеры"]
    }
  },
  {
    canonicalName: "Помощник нотариуса",
    category: "Юриспруденция",
    synonyms: ["нотариальный помощник", "notary assistant"],
    sourceMappings: {
      "makler.md": ["Помощники нотариуса"]
    }
  },
  {
    canonicalName: "Техник по обслуживанию бассейнов",
    category: "Обслуживание",
    synonyms: ["техник бассейнов", "pool maintenance technician"],
    sourceMappings: {
      "999.md": ["Техник по обслуживанию бассейнов"]
    }
  },
  {
    canonicalName: "Садовник",
    category: "Сельское хозяйство",
    synonyms: ["садовод", "озеленитель", "gardener"],
    sourceMappings: {
      "999.md": ["Садовник"]
    }
  },
  {
    canonicalName: "Агроном",
    category: "Сельское хозяйство",
    synonyms: ["агрономист", "сельхозработник", "agronomist"],
    sourceMappings: {
      "rabota.md": ["Агроном"],
      "999.md": ["Агроном", "Агрохимик, лаборант"],
      "makler.md": ["Агрономы", "Сельхоз работники"]
    }
  },
  {
    canonicalName: "Ветеринар",
    category: "Медицина",
    synonyms: ["ветеринарный врач", "ветврач", "veterinarian"],
    sourceMappings: {
      "rabota.md": ["Ветеринар"],
      "999.md": ["Ветеринарный врач"],
      "makler.md": ["Ветеринары"]
    }
  },
  {
    canonicalName: "Зоотехник",
    category: "Сельское хозяйство",
    synonyms: ["животновод", "zootechnician"],
    sourceMappings: {
      "999.md": ["Зоотехник"]
    }
  },
  {
    canonicalName: "Специалист по орошению и водоснабжению",
    category: "Сельское хозяйство",
    synonyms: ["ирригатор", "water supply specialist"],
    sourceMappings: {
      "999.md": ["Специалист по орошению и водоснабжению"]
    }
  },
  {
    canonicalName: "Фермер",
    category: "Сельское хозяйство",
    synonyms: ["земледелец", "фермерство", "farmer"],
    sourceMappings: {
      "999.md": ["Фермер"]
    }
  },
  {
    canonicalName: "Каменщик",
    category: "Строительство",
    synonyms: ["бетонщик", "кладчик", "mason"],
    sourceMappings: {
      "rabota.md": ["Каменщик"],
      "999.md": ["Каменщик, бетонщик"]
    }
  },
  {
    canonicalName: "Плиточник",
    category: "Строительство",
    synonyms: ["отделочник-плиточник", "tile setter"],
    sourceMappings: {
      "999.md": ["Отделочник, плиточник"]
    }
  },
  {
    canonicalName: "Кровельщик",
    category: "Строительство",
    synonyms: ["кровельщик-жестянщик", "roofer"],
    sourceMappings: {
      "999.md": ["Кровельщик"]
    }
  },
  {
    canonicalName: "Токарь",
    category: "Производство",
    synonyms: ["фрезеровщик", "шлифовщик", "turner", "miller"],
    sourceMappings: {
      "999.md": ["Токарь, фрезеровщик, шлифовщик"]
    }
  },
  {
    canonicalName: "Машинист",
    category: "Производство",
    synonyms: ["машинист техники", "driver operator"],
    sourceMappings: {
      "999.md": ["Машинист"]
    }
  },
  {
    canonicalName: "Оператор строительной техники",
    category: "Строительство",
    synonyms: ["оператор спецтехники", "construction equipment operator"],
    sourceMappings: {
      "999.md": ["Оператор строительной техники"]
    }
  },
  {
    canonicalName: "Сборщик",
    category: "Производство",
    synonyms: ["сборщик изделий", "assembler"],
    sourceMappings: {
      "rabota.md": ["Сборщик", "Сборщик мебели"]
    }
  },
  {
    canonicalName: "Упаковщик",
    category: "Производство",
    synonyms: ["комплектовщик", "packer"],
    sourceMappings: {
      "999.md": ["Упаковщик, комплектовщик"]
    }
  },
  {
    canonicalName: "Монтажник",
    category: "Строительство",
    synonyms: ["монтажник систем", "установщик", "installer"],
    sourceMappings: {
      "rabota.md": ["Монтажник"],
      "999.md": ["Монтажник", "Монтажник систем безопасности"],
      "makler.md": ["Монтажники вентиляционных систем", "Монтажники газового оборудования", "Монтажники, техники"]
    }
  },
  {
    canonicalName: "Электрик",
    category: "Строительство",
    synonyms: ["электромонтажник", "электрик-монтажник", "electrician"],
    sourceMappings: {
      "rabota.md": ["Электрик", "Электромонтажник"],
      "999.md": ["Электромонтажник"],
      "makler.md": ["Электромонтажники"]
    }
  },
  {
    canonicalName: "Сантехник",
    category: "Строительство",
    synonyms: ["водопроводчик", "plumber"],
    sourceMappings: {
      "rabota.md": ["Сантехник"],
      "999.md": ["Слесарь, сантехник"],
      "makler.md": ["Сантехники"]
    }
  },
  {
    canonicalName: "Кальянщик",
    category: "Обслуживание",
    synonyms: ["hookah master", "кальянный мастер"],
    sourceMappings: {
      "rabota.md": ["Кальянщик"],
      "999.md": ["Кальянщик"]
    }
  },
  {
    canonicalName: "Работник АЗС",
    category: "Обслуживание",
    synonyms: ["заправщик", "оператор АЗС", "gas station attendant"],
    sourceMappings: {
      "999.md": ["Работник АЗС"],
      "makler.md": ["Работники заправочной станции"]
    }
  },
  {
    canonicalName: "Автомойщик",
    category: "Обслуживание",
    synonyms: ["мойщик авто", "car washer"],
    sourceMappings: {
      "rabota.md": ["Автомойщик"],
      "999.md": ["Автомойщик"],
      "makler.md": ["Мойщики авто"]
    }
  },
  {
    canonicalName: "Автомеханик",
    category: "Производство",
    synonyms: ["автослесарь", "механик авто", "auto mechanic"],
    sourceMappings: {
      "rabota.md": ["Автомеханик", "Автослесарь"],
      "999.md": ["Автослесарь, автомеханик"]
    }
  },
  {
    canonicalName: "Шиномонтажник",
    category: "Производство",
    synonyms: ["шиномонтаж", "tire fitter"],
    sourceMappings: {
      "999.md": ["Шиномонтажник"]
    }
  },
  {
    canonicalName: "Вулканизаторщик",
    category: "Производство",
    synonyms: ["вулканизатор", "tire vulcanizer"],
    sourceMappings: {
      "rabota.md": ["Вулканизаторщик"]
    }
  },
  {
    canonicalName: "Лаборант",
    category: "Наука",
    synonyms: ["лабораторный работник", "лаборант-химик", "laboratory assistant"],
    sourceMappings: {
      "rabota.md": ["Лаборант"],
      "999.md": ["Лаборант", "Агрохимик, лаборант"]
    }
  },
  {
    canonicalName: "Химик",
    category: "Наука",
    synonyms: ["химик-аналитик", "chemist"],
    sourceMappings: {
      "rabota.md": ["Химик"]
    }
  },
  {
    canonicalName: "Математик",
    category: "Наука",
    synonyms: ["математик-аналитик", "mathematician"],
    sourceMappings: {
      "rabota.md": ["Математик"]
    }
  },
  {
    canonicalName: "Научный специалист",
    category: "Наука",
    synonyms: ["исследователь", "scientist"],
    sourceMappings: {
      "999.md": ["Научный специалист, исследователь"]
    }
  },
  {
    canonicalName: "Аналитик",
    category: "Административная",
    synonyms: ["бизнес-аналитик", "data analyst", "analyst"],
    sourceMappings: {
      "rabota.md": ["Аналитик", "Бизнес аналитик"],
      "999.md": ["Аналитик, BI-аналитик, аналитик данных", "Кредитный аналитик", "Финансовый аналитик", "Маркетолог-аналитик"]
    }
  },
  {
    canonicalName: "Аудитор",
    category: "Финансы",
    synonyms: ["ревизор", "аудитор-консультант", "auditor"],
    sourceMappings: {
      "rabota.md": ["Аудитор"],
      "999.md": ["Аудитор"]
    }
  },
  {
    canonicalName: "Консультант",
    category: "Продажи",
    synonyms: ["советник", "консультант-специалист", "consultant"],
    sourceMappings: {
      "rabota.md": ["Консультант"],
      "999.md": ["Налоговый консультант", "Финансовый консультант"]
    }
  },
  {
    canonicalName: "Координатор",
    category: "Административная",
    synonyms: ["координатор проектов", "coordinator"],
    sourceMappings: {
      "rabota.md": ["Координатор"]
    }
  },
  {
    canonicalName: "Диспетчер",
    category: "Логистика",
    synonyms: ["логист-диспетчер", "dispatcher"],
    sourceMappings: {
      "rabota.md": ["Диспетчер"],
      "999.md": ["Диспетчер"]
    }
  },
  {
    canonicalName: "Инспектор",
    category: "Административная",
    synonyms: ["контролер", "инспектор-проверяющий", "inspector"],
    sourceMappings: {
      "rabota.md": ["Инспектор", "Контролер"]
    }
  },
  {
    canonicalName: "Метролог",
    category: "Производство",
    synonyms: ["метролог-поверитель", "metrologist"],
    sourceMappings: {
      "rabota.md": ["Метролог"],
      "999.md": ["Метролог"]
    }
  },
  {
    canonicalName: "Технолог",
    category: "Производство",
    synonyms: ["инженер-технолог", "technologist"],
    sourceMappings: {
      "rabota.md": ["Технолог"],
      "999.md": ["Технолог"]
    }
  },
  {
    canonicalName: "Товаровед",
    category: "Торговля",
    synonyms: ["товаровед-эксперт", "merchandise expert"],
    sourceMappings: {
      "rabota.md": ["Товаровед"]
    }
  },
  {
    canonicalName: "Крановщик",
    category: "Строительство",
    synonyms: ["оператор крана", "crane operator"],
    sourceMappings: {
      "rabota.md": ["Крановщик"]
    }
  },
  {
    canonicalName: "Бульдозерист",
    category: "Строительство",
    synonyms: ["оператор бульдозера", "bulldozer operator"],
    sourceMappings: {
      "rabota.md": ["Бульдозерист"]
    }
  },
  {
    canonicalName: "Заведующий хозяйством",
    category: "Административная",
    synonyms: ["завхоз", "хозяйственник", "supply manager"],
    sourceMappings: {
      "rabota.md": ["Заведующий хозяйством"]
    }
  },
  {
    canonicalName: "Кладовщик",
    category: "Логистика",
    synonyms: ["складской работник", "storekeeper"],
    sourceMappings: {
      "rabota.md": ["Кладовщик"],
      "999.md": ["Кладовщик"],
      "makler.md": ["Кладовщики"]
    }
  },
  {
    canonicalName: "Инкассатор",
    category: "Финансы",
    synonyms: ["инкассатор-охранник", "cash collector"],
    sourceMappings: {
      "rabota.md": ["Инкассатор"]
    }
  },
  {
    canonicalName: "Охранник",
    category: "Безопасность",
    synonyms: ["сторож", "телохранитель", "security guard"],
    sourceMappings: {
      "rabota.md": ["Охранник"],
      "999.md": ["Охранник, телохранитель"],
      "makler.md": ["Охранники", "Вахтёры"]
    }
  },
  {
    canonicalName: "Инженер по безопасности",
    category: "Безопасность",
    synonyms: ["специалист по безопасности", "safety engineer"],
    sourceMappings: {
      "999.md": ["Инженер по безопасности", "Специалист по пожарной безопасности"]
    }
  },
  {
    canonicalName: "Специалист по охране труда",
    category: "Безопасность",
    synonyms: ["инженер по охране труда", "occupational safety specialist"],
    sourceMappings: {
      "999.md": ["Специалист по охране труда"]
    }
  },
  {
    canonicalName: "Психолог",
    category: "Медицина",
    synonyms: ["психотерапевт", "клинический психолог", "psychologist"],
    sourceMappings: {
      "rabota.md": ["Психолог"],
      "999.md": ["Психотерапевт, психолог"],
      "makler.md": ["Психологи"]
    }
  },
  {
    canonicalName: "Логопед",
    category: "Медицина",
    synonyms: ["дефектолог", "speech therapist"],
    sourceMappings: {
      "999.md": ["Логопед"]
    }
  },
  {
    canonicalName: "Сиделка",
    category: "Медицина",
    synonyms: ["медсестра по уходу", "ухаживающий", "caregiver"],
    sourceMappings: {
      "rabota.md": ["Сиделка"],
      "999.md": ["Сиделка"],
      "makler.md": ["Сиделки"]
    }
  },
  {
    canonicalName: "Санитарка",
    category: "Медицина",
    synonyms: ["санитар", "медбрат-санитар", "orderly"],
    sourceMappings: {
      "999.md": ["Санитарка, санитар"]
    }
  },
  {
    canonicalName: "Медицинский представитель",
    category: "Медицина",
    synonyms: ["фарм-представитель", "medical representative"],
    sourceMappings: {
      "rabota.md": ["Медицинский представитель"],
      "999.md": ["Медицинский представитель"]
    }
  },
  {
    canonicalName: "Фитнес-тренер",
    category: "Спорт",
    synonyms: ["инструктор по фитнесу", "fitness instructor"],
    sourceMappings: {
      "999.md": ["Фитнес-тренер, инструктор"],
      "makler.md": ["Тренера, инструкторы"]
    }
  },
  {
    canonicalName: "Тренер",
    category: "Спорт",
    synonyms: ["коуч", "спортивный тренер", "coach"],
    sourceMappings: {
      "rabota.md": ["Тренер", "Инструктор"],
      "999.md": ["Тренер, коуч"],
      "makler.md": ["Тренера, инструкторы"]
    }
  },
  {
    canonicalName: "Спортивный массажист",
    category: "Спорт",
    synonyms: ["массажист спортсменов", "sports masseur"],
    sourceMappings: {
      "999.md": ["Массажист, спортивный массажист"]
    }
  },
  {
    canonicalName: "Артист",
    category: "Культура и творчество",
    synonyms: ["актер", "актриса", "артист эстрады", "performer"],
    sourceMappings: {
      "rabota.md": ["Актер", "Актриса"],
      "999.md": ["Артист, актер, аниматор"],
      "makler.md": ["Ведущие, актеры"]
    }
  },
  {
    canonicalName: "Аниматор",
    category: "Культура и творчество",
    synonyms: ["ведущий мероприятий", "организатор праздников", "animator"],
    sourceMappings: {
      "rabota.md": ["Аниматор"],
      "999.md": ["Артист, актер, аниматор", "Ведущий мероприятий"]
    }
  },
  {
    canonicalName: "Музыкант",
    category: "Культура и творчество",
    synonyms: ["певец", "инструменталист", "musician"],
    sourceMappings: {
      "999.md": ["Музыкант, DJ"],
      "makler.md": ["Музыканты, певцы"]
    }
  },
  {
    canonicalName: "DJ",
    category: "Культура и творчество",
    synonyms: ["диджей", "disk jockey"],
    sourceMappings: {
      "rabota.md": ["DJ"],
      "999.md": ["Музыкант, DJ"]
    }
  },
  {
    canonicalName: "Танцор",
    category: "Культура и творчество",
    synonyms: ["танцовщица", "хореограф", "танцевальный исполнитель", "dancer"],
    sourceMappings: {
      "rabota.md": ["Танцор", "Танцовщица", "Хореограф"],
      "999.md": ["Танцор, танцовщица, хореограф"]
    }
  },
  {
    canonicalName: "Балетмейстер",
    category: "Культура и творчество",
    synonyms: ["хореограф-постановщик", "ballet master"],
    sourceMappings: {
      "rabota.md": ["Балетмейстер"]
    }
  },
  {
    canonicalName: "Звукорежиссер",
    category: "Культура и творчество",
    synonyms: ["звукооператор", "sound engineer"],
    sourceMappings: {
      "rabota.md": ["Звукорежиссер", "Звукотехник"],
      "999.md": ["Звукорежиссер"]
    }
  },
  {
    canonicalName: "Видеооператор",
    category: "Культура и творчество",
    synonyms: ["видеомонтажер", "видеограф", "video operator"],
    sourceMappings: {
      "999.md": ["Видеооператор, видеомонтажер"]
    }
  },
  {
    canonicalName: "Режиссер",
    category: "Культура и творчество",
    synonyms: ["сценарист", "режиссер-постановщик", "director"],
    sourceMappings: {
      "999.md": ["Режиссер, сценарист"]
    }
  },
  {
    canonicalName: "Продюсер",
    category: "Культура и творчество",
    synonyms: ["продюсер проектов", "producer"],
    sourceMappings: {
      "999.md": ["Продюсер"]
    }
  },
  {
    canonicalName: "Арт-директор",
    category: "Культура и творчество",
    synonyms: ["креативный директор", "art director"],
    sourceMappings: {
      "999.md": ["Арт-директор, креативный директор"]
    }
  },
  {
    canonicalName: "Редактор",
    category: "Культура и творчество",
    synonyms: ["корректор", "литературный редактор", "editor"],
    sourceMappings: {
      "rabota.md": ["Редактор"],
      "999.md": ["Копирайтер, редактор, корректор"],
      "makler.md": ["Редактор, корректор"]
    }
  },
  {
    canonicalName: "Копирайтер",
    category: "Культура и творчество",
    synonyms: ["рерайтер", "текстовый автор", "copywriter"],
    sourceMappings: {
      "rabota.md": ["Копирайтер"],
      "999.md": ["Копирайтер, редактор, корректор"],
      "makler.md": ["Копирайтеры, рерайтеры"]
    }
  },
  {
    canonicalName: "Переводчик",
    category: "Культура и творчество",
    synonyms: ["лингвист", "переводчик-синхронист", "translator"],
    sourceMappings: {
      "rabota.md": ["Переводчик", "Лингвист"],
      "makler.md": ["Переводчики"]
    }
  },
  {
    canonicalName: "Специалист по переводу",
    category: "Культура и творчество",
    synonyms: ["переводчик-технический", "translation specialist"],
    sourceMappings: {
      "999.md": ["Специалист по переводу"]
    }
  },
  {
    canonicalName: "Промоутер",
    category: "Маркетинг",
    synonyms: ["промоутер-раздатчик", "промо-модель", "promoter"],
    sourceMappings: {
      "rabota.md": ["Промоутер"],
      "999.md": ["Промоутер"],
      "makler.md": ["Промоутеры"]
    }
  },
  {
    canonicalName: "Мерчендайзер",
    category: "Маркетинг",
    synonyms: ["мерчендайзер-выкладчик", "merchandiser"],
    sourceMappings: {
      "rabota.md": ["Мерчендайзер"]
    }
  },
  {
    canonicalName: "PR-менеджер",
    category: "Маркетинг",
    synonyms: ["пиар-менеджер", "public relations manager"],
    sourceMappings: {
      "rabota.md": ["PR менеджер"],
      "999.md": ["PR-менеджер"]
    }
  },
  {
    canonicalName: "Event-менеджер",
    category: "Маркетинг",
    synonyms: ["ивент-менеджер", "организатор мероприятий", "event manager"],
    sourceMappings: {
      "999.md": ["Event-менеджер"]
    }
  },
  {
    canonicalName: "SEO-специалист",
    category: "Маркетинг",
    synonyms: ["сеошник", "оптимизатор", "SEO specialist"],
    sourceMappings: {
      "rabota.md": ["Сеошник", "Seo"],
      "makler.md": ["SEO"]
    }
  },
  {
    canonicalName: "Специалист по тендерам",
    category: "Административная",
    synonyms: ["тендерный специалист", "tender specialist"],
    sourceMappings: {
      "999.md": ["Специалист по тендерам"]
    }
  },
  {
    canonicalName: "Специалист по сертификации",
    category: "Административная",
    synonyms: ["сертификационный специалист", "certification specialist"],
    sourceMappings: {
      "999.md": ["Специалист по сертификации"]
    }
  },
  {
    canonicalName: "HR-менеджер",
    category: "Административная",
    synonyms: ["рекрутер", "кадровик", "HR specialist"],
    sourceMappings: {
      "rabota.md": ["Менеджер по персоналу", "Рекрутер", "Кадровик", "HR"],
      "999.md": ["HR-менеджер", "Рекрутер"],
      "makler.md": ["Кадры, HR"]
    }
  },
  {
    canonicalName: "Страховой агент",
    category: "Финансы",
    synonyms: ["страховщик", "агент по страхованию", "insurance agent"],
    sourceMappings: {
      "rabota.md": ["Страховщик"],
      "999.md": ["Страховой агент"],
      "makler.md": ["Страховые агенты"]
    }
  },
  {
    canonicalName: "Налоговый консультант",
    category: "Финансы",
    synonyms: ["налоговый специалист", "tax consultant"],
    sourceMappings: {
      "999.md": ["Налоговый консультант"]
    }
  },
  {
    canonicalName: "Специалист по взысканию задолженностей",
    category: "Финансы",
    synonyms: ["коллектор", "взыскатель долгов", "debt collector"],
    sourceMappings: {
      "999.md": ["Специалист по взысканию задолженностей"]
    }
  },
  {
    canonicalName: "Кредитный специалист",
    category: "Финансы",
    synonyms: ["кредитный менеджер", "кредитный консультант", "credit specialist"],
    sourceMappings: {
      "rabota.md": ["Менеджер по кредитованию"],
      "999.md": ["Кредитный менеджер", "Кредитный специалист", "Руководитель отдела кредитования"]
    }
  },
  {
    canonicalName: "Дата-сайентист",
    category: "ИТ",
    synonyms: ["специалист по данным", "data scientist"],
    sourceMappings: {
      "999.md": ["Дата-сайентист"]
    }
  },
  {
    canonicalName: "Продуктовый менеджер",
    category: "ИТ",
    synonyms: ["продакт-менеджер", "product manager"],
    sourceMappings: {
      "999.md": ["Продуктовый менеджер (PM)"]
    }
  },
  {
    canonicalName: "Методолог",
    category: "Образование",
    synonyms: ["методист", "methodologist"],
    sourceMappings: {
      "999.md": ["Методолог"]
    }
  },
  {
    canonicalName: "Менеджер ресторана",
    category: "Обслуживание",
    synonyms: ["управляющий рестораном", "ресторатор", "restaurant manager"],
    sourceMappings: {
      "rabota.md": ["Ресторатор"],
      "999.md": ["Менеджер ресторана"]
    }
  },
  {
    canonicalName: "Сомелье",
    category: "Обслуживание",
    synonyms: ["винный эксперт", "sommelier"],
    sourceMappings: {
      "999.md": ["Сомелье"]
    }
  },
  {
    canonicalName: "Хостес",
    category: "Обслуживание",
    synonyms: ["хостесс", "принимающий персонал", "hostess"],
    sourceMappings: {
      "rabota.md": ["Хостесс"],
      "999.md": ["Хостес"]
    }
  },
  {
    canonicalName: "Швейцар",
    category: "Обслуживание",
    synonyms: ["портье", "дверник", "concierge"],
    sourceMappings: {
      "rabota.md": ["Швейцар"]
    }
  },
  {
    canonicalName: "Горничная",
    category: "Обслуживание",
    synonyms: ["уборщица номеров", "maid"],
    sourceMappings: {
      "rabota.md": ["Горничная"]
    }
  },
  {
    canonicalName: "Крупье",
    category: "Развлечения",
    synonyms: ["дилер", "крупье-кассир", "croupier"],
    sourceMappings: {
      "rabota.md": ["Крупье"]
    }
  },
  {
    canonicalName: "Дантист",
    category: "Медицина",
    synonyms: ["зубной врач", "стоматолог", "dentist"],
    sourceMappings: {
      "rabota.md": ["Дантист", "Стоматолог", "Зубной техник"]
    }
  },
  {
    canonicalName: "Фельдшер",
    category: "Медицина",
    synonyms: ["фельдшер-акушер", "paramedic"],
    sourceMappings: {
      "rabota.md": ["Фельдшер"]
    }
  },
  {
    canonicalName: "Технический специалист",
    category: "ИТ",
    synonyms: ["техподдержка", "IT-специалист", "technical support"],
    sourceMappings: {
      "rabota.md": ["Техник"],
      "999.md": ["Специалист технической поддержки"],
      "makler.md": ["Техподдержка"]
    }
  },
  {
    canonicalName: "Инженер-энергетик",
    category: "Энергетика",
    synonyms: ["энергетик", "инженер электросетей", "power engineer"],
    sourceMappings: {
      "rabota.md": ["Инженер энергетик", "Энергетик"]
    }
  },
  {
    canonicalName: "Инженер-электронщик",
    category: "Электроника",
    synonyms: ["электронщик", "инженер электроники", "electronics engineer"],
    sourceMappings: {
      "rabota.md": ["Инженер электронщик", "Электронщик"]
    }
  },
  {
    canonicalName: "Девелопер",
    category: "Недвижимость",
    synonyms: ["застройщик", "риэлтор-девелопер", "developer"],
    sourceMappings: {
      "rabota.md": ["Девелопер"]
    }
  },
  {
    canonicalName: "Дистрибьютор",
    category: "Торговля",
    synonyms: ["дистрибьютор-поставщик", "distributor"],
    sourceMappings: {
      "rabota.md": ["Дистрибьютер"]
    }
  },
  {
    canonicalName: "Коммерсант",
    category: "Торговля",
    synonyms: ["торговец", "коммерческий директор", "merchant"],
    sourceMappings: {
      "rabota.md": ["Коммерсант"]
    }
  },
  {
    canonicalName: "Бизнес-тренер",
    category: "Образование",
    synonyms: ["тренер-консультант", "business coach"],
    sourceMappings: {
      "rabota.md": ["Бизнес тренер"]
    }
  },
  {
    canonicalName: "Менеджер по туризму",
    category: "Туризм",
    synonyms: ["турменеджер", "менеджер по турам", "tour manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по туризму"],
      "999.md": ["Менеджер по туризму"],
      "makler.md": ["Менеджеры по туризму"]
    }
  },
  {
    canonicalName: "Менеджер по рекламе",
    category: "Маркетинг",
    synonyms: ["рекламный менеджер", "advertising manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по рекламе"]
    }
  },
  {
    canonicalName: "Менеджер по закупкам",
    category: "Логистика",
    synonyms: ["закупщик", "снабженец", "purchasing manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по закупкам"],
      "999.md": ["Менеджер по закупкам"]
    }
  },
  {
    canonicalName: "Менеджер по транспорту",
    category: "Логистика",
    synonyms: ["транспортный менеджер", "transport manager"],
    sourceMappings: {
      "rabota.md": ["Менеджер по транспорту"],
      "makler.md": ["Менеджеры перевозок"]
    }
  },
  {
    canonicalName: "Супервайзер",
    category: "Управление",
    synonyms: ["контролер", "надзиратель", "supervisor"],
    sourceMappings: {
      "rabota.md": ["Супервайзер"]
    }
  },
  {
    canonicalName: "Менеджер проектов",
    category: "Управление",
    synonyms: ["project manager", "руководитель проектов"],
    sourceMappings: {
      "rabota.md": ["Менеджер проектов"],
      "makler.md": ["Руководители проектов"]
    }
  },
  {
    canonicalName: "Сметчик",
    category: "Строительство",
    synonyms: ["инженер-сметчик", "estimator"],
    sourceMappings: {
      "rabota.md": ["Сметчик"]
    }
  },
  {
    canonicalName: "Заготовщик",
    category: "Производство",
    synonyms: ["закройщик", "резчик", "cutter"],
    sourceMappings: {
      "rabota.md": ["Закройщик"],
      "999.md": ["Швея, портной, закройщик"]
    }
  },
  {
    canonicalName: "Швея",
    category: "Производство",
    synonyms: ["портной", "швейный мастер", "seamstress"],
    sourceMappings: {
      "rabota.md": ["Швея"],
      "999.md": ["Швея, портной, закройщик"]
    }
  },
  {
    canonicalName: "Десертница",
    category: "Обслуживание",
    synonyms: ["кондитер-десертник", "dessert chef"],
    sourceMappings: {
      "rabota.md": ["Десертница"]
    }
  },
  {
    canonicalName: "Пекарь",
    category: "Обслуживание",
    synonyms: ["кондитер-пекарь", "baker"],
    sourceMappings: {
      "rabota.md": ["Пекарь"],
      "999.md": ["Повар, пекарь, кондитер"]
    }
  },
  {
    canonicalName: "Кондитер",
    category: "Обслуживание",
    synonyms: ["кондитер-шоколатье", "pastry chef"],
    sourceMappings: {
      "rabota.md": ["Кондитер"],
      "makler.md": ["Кондитеры"]
    }
  },
  {
    canonicalName: "Печатник",
    category: "Полиграфия",
    synonyms: ["типограф", "печатный мастер", "printer"],
    sourceMappings: {
      "rabota.md": ["Печатник"]
    }
  },
  {
    canonicalName: "Печник",
    category: "Строительство",
    synonyms: ["печной мастер", "stove maker"],
    sourceMappings: {
      "rabota.md": ["Печник"]
    }
  },
  {
    canonicalName: "Посудомойка",
    category: "Обслуживание",
    synonyms: ["мойщик посуды", "dishwasher"],
    sourceMappings: {
      "rabota.md": ["Посудомойка"]
    }
  },
  {
    canonicalName: "Дворник",
    category: "Обслуживание",
    synonyms: ["уборщик территории", "street cleaner"],
    sourceMappings: {
      "rabota.md": ["Дворник"],
      "999.md": ["Дворник"]
    }
  },
  {
    canonicalName: "Студент",
    category: "Образование",
    synonyms: ["учащийся", "студент-практикант", "student"],
    sourceMappings: {
      "rabota.md": ["Студент"]
    }
  },
  {
    canonicalName: "Работа за рубежом",
    category: "Другое",
    synonyms: ["работа в другой стране", "зарубежная работа", "work abroad"],
    sourceMappings: {
      "999.md": ["Работа за рубежом"]
    }
  },
  {
    canonicalName: "Разное",
    category: "Другое",
    synonyms: ["другое", "прочее", "other", "miscellaneous"],
    sourceMappings: {
      "999.md": ["Разное"],
      "makler.md": ["Прочее", "Персонал без специальной подготовки"]
    }
  },
  {
    canonicalName: "Мастер по депиляции",
    category: "Обслуживание",
    synonyms: ["эпилятор", "специалист по депиляции", "hair removal specialist"],
    sourceMappings: {
      "999.md": ["Мастер по депиляции"]
    }
  },
  {
    canonicalName: "Тату-мастер",
    category: "Обслуживание",
    synonyms: ["мастер по пирсингу", "татуировщик", "tattoo artist"],
    sourceMappings: {
      "999.md": ["Тату-мастер, мастер по пирсингу"]
    }
  },
  {
    canonicalName: "Мастер маникюра",
    category: "Обслуживание",
    synonyms: ["маникюрщица", "педикюрщица", "nail technician"],
    sourceMappings: {
      "999.md": ["Мастер маникюра, педикюра"],
      "makler.md": ["Маникюр, педикюр"]
    }
  },
  {
    canonicalName: "Мастер-бровист",
    category: "Обслуживание",
    synonyms: ["бровист", "специалист по бровям", "eyebrow specialist"],
    sourceMappings: {
      "999.md": ["Мастер-бровист"]
    }
  },
  {
    canonicalName: "Спа-мастер",
    category: "Обслуживание",
    synonyms: ["специалист по спа", "спа-терапевт", "spa master"],
    sourceMappings: {
      "999.md": ["Спа-мастер"]
    }
  },
  {
    canonicalName: "Гратарщик",
    category: "Обслуживание",
    synonyms: ["гриль-повар", "grill master"],
    sourceMappings: {
      "rabota.md": ["Гратарщик"]
    }
  },
  {
    canonicalName: "Оператор",
    category: "Производство",
    synonyms: ["оператор оборудования", "оператор линии", "operator"],
    sourceMappings: {
      "rabota.md": ["Оператор", "Оператор ПК"],
      "999.md": ["Оператор производственной линии", "Оператор видеонаблюдения"],
      "makler.md": ["Операторы", "Оперативники"]
    }
  },
  {
    canonicalName: "Администратор базы данных",
    category: "ИТ",
    synonyms: ["DBA", "database administrator"],
    sourceMappings: {
      "rabota.md": ["Администратор базы данных"]
    }
  },
  {
    canonicalName: "Unity разработчик",
    category: "ИТ",
    synonyms: ["Unity-программист", "Unity developer"],
    sourceMappings: {
      "rabota.md": ["Unity"]
    }
  },
  {
    canonicalName: "Работник производства",
    category: "Производство",
    synonyms: ["производственный работник", "factory worker"],
    sourceMappings: {
      "rabota.md": ["Работник на производство"],
      "999.md": ["Рабочие на производство"],
      "makler.md": ["Рабочие"]
    }
  },
  {
    canonicalName: "Ассистент",
    category: "Административная",
    synonyms: ["помощник", "ассистент-секретарь", "assistant"],
    sourceMappings: {
      "rabota.md": ["Ассистент", "Помощник"]
    }
  },
  {
    canonicalName: "Банкир",
    category: "Финансы",
    synonyms: ["банковский работник", "banker"],
    sourceMappings: {
      "rabota.md": ["Банкир", "Банковский работник"]
    }
  },
  {
    canonicalName: "Инженер по эксплуатации",
    category: "Техническое обслуживание",
    synonyms: ["инженер-эксплуатационник", "maintenance engineer"],
    sourceMappings: {
      "999.md": ["Инженер по эксплуатации"]
    }
  },
  {
    canonicalName: "Инженер инфраструктуры",
    category: "ИТ",
    synonyms: ["инфраструктурный инженер", "infrastructure engineer"],
    sourceMappings: {
      "999.md": ["Инженер инфраструктуры"]
    }
  },
  {
    canonicalName: "Инженер-техник",
    category: "Техническое обслуживание",
    synonyms: ["технический инженер", "engineering technician"],
    sourceMappings: {
      "rabota.md": ["Инженер техник"]
    }
  },
];
// Экспорт по умолчанию для удобного импорта
export default CANONICAL_PROFESSIONS;