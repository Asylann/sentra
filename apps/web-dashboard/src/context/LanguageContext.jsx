import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  en: {
    // Nav
    'nav.agent': 'Agent',
    'nav.enterprise': 'Enterprise',
    'nav.pricing': 'Pricing',
    'nav.blog': 'Blog',
    'nav.signin': 'Sign In',
    'nav.signup': 'Sign Up',

    // Hero
    'hero.title.line1': 'The intelligent gatekeeper',
    'hero.title.line2': 'for your engineering team.',
    'hero.subtitle': 'Your team moves fast with AI. But fast shouldn\'t mean sloppy. Every line earns its merge.',
    'hero.cta': 'Get Started',
    'hero.demo': 'See Demo',

    // B2B Team Section
    'team.badge': 'For Engineering Teams',
    'team.title': 'Build great software',
    'team.title.highlight': 'together.',
    'team.subtitle': 'Every pull request flows through Sentra. Your team gets instant feedback, quality scores, and one-click fixes — before a single line reaches main.',
    'team.opened_pr': 'opened a PR',
    'team.scan': 'Scan',
    'team.ai_review': 'AI Review',
    'team.score': 'Score',
    'team.suggestion': 'SUGGESTION',
    'team.prs_reviewed': 'PRs reviewed',
    'team.avg_score': 'Avg score',
    'team.bugs_caught': 'Bugs caught',
    'team.engineers_active': 'engineers active',
    'team.tagline': 'Trusted by teams at startups and enterprises shipping 50+ PRs per week.',

    // Leaderboard Section
    'leaderboard.badge': 'Team Metrics',
    'leaderboard.title': 'Know who\'s',
    'leaderboard.title.highlight': 'shipping quality.',
    'leaderboard.subtitle': 'Track performance across your engineering org. Quality scores, PR volume, and a performance index that rewards both speed and craftsmanship.',
    'leaderboard.chart_title': 'Performance Quadrant',
    'leaderboard.legend.high_both': 'High Quality + Volume',
    'leaderboard.legend.high_quality': 'High Quality',
    'leaderboard.col.rank': 'Rank',
    'leaderboard.col.developer': 'Developer',
    'leaderboard.col.prs': 'PRs',
    'leaderboard.col.quality': 'Avg Quality',
    'leaderboard.col.index': 'Index',
    'leaderboard.axis.volume': 'PR Volume →',
    'leaderboard.axis.quality': 'Avg Quality →',

    // Scroll reveal
    'scroll.text': 'We built Sentra because AI-generated code still needs intelligent review. Not just linting — real architectural understanding, security analysis, and context-aware suggestions that make your team ship faster and safer.',

    // How it works
    'how.badge': 'How it works',
    'how.title.line1': 'Three steps.',
    'how.title.line2': 'Zero friction.',

    // How it works steps
    'how.step1.title': 'Open a Pull Request',
    'how.step1.desc': 'Push code as you normally do. Sentra detects new PRs instantly via GitHub webhooks.',
    'how.step2.title': 'AI Analyzes the Diff',
    'how.step2.desc': 'Context-aware analysis: security vulnerabilities, architectural issues, performance concerns, and code quality.',
    'how.step3.title': 'Review & Ship',
    'how.step3.desc': 'Inline comments appear on GitHub. One-click fixes for simple issues. Merge with confidence.',

    // Stats
    'stats.title': 'Trusted at scale.',
    'stats.review_time': 'Average Review Time',
    'stats.accuracy': 'Accuracy Rate',
    'stats.fewer_incidents': 'Fewer Incidents',
    'stats.faster_shipping': 'Faster Shipping',

    // CTA
    'cta.title.line1': 'Stop shipping bugs.',
    'cta.title.line2': 'Start shipping confidence.',
    'cta.subtitle': 'Join engineering teams at startups and enterprises who trust Sentra to guard their codebase.',
    'cta.button': 'Start Free Trial',
    'cta.note': 'No credit card required',

    // Footer
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.legal': 'Legal',
    'footer.copyright': '© 2025 Sentra AI. All rights reserved.',
  },
  ru: {
    // Nav
    'nav.agent': 'Агент',
    'nav.enterprise': 'Для бизнеса',
    'nav.pricing': 'Цены',
    'nav.blog': 'Блог',
    'nav.signin': 'Войти',
    'nav.signup': 'Регистрация',

    // Hero
    'hero.title.line1': 'Интеллектуальный страж',
    'hero.title.line2': 'вашей инженерной команды.',
    'hero.subtitle': 'Ваша команда работает быстро с ИИ. Но быстро не должно означать небрежно. Каждая строка заслуживает своего мержа.',
    'hero.cta': 'Начать',
    'hero.demo': 'Демо',

    // B2B Team Section
    'team.badge': 'Для инженерных команд',
    'team.title': 'Создавайте отличный софт',
    'team.title.highlight': 'вместе.',
    'team.subtitle': 'Каждый pull request проходит через Sentra. Ваша команда получает мгновенную обратную связь, оценки качества и исправления в один клик — до того, как код попадёт в main.',
    'team.opened_pr': 'открыл PR',
    'team.scan': 'Скан',
    'team.ai_review': 'ИИ-ревью',
    'team.score': 'Оценка',
    'team.suggestion': 'ПРЕДЛОЖЕНИЕ',
    'team.prs_reviewed': 'PR проверено',
    'team.avg_score': 'Средний балл',
    'team.bugs_caught': 'Багов найдено',
    'team.engineers_active': 'инженеров активно',
    'team.tagline': 'Доверяют команды стартапов и корпораций, отправляющие 50+ PR в неделю.',

    // Leaderboard Section
    'leaderboard.badge': 'Метрики команды',
    'leaderboard.title': 'Знайте, кто',
    'leaderboard.title.highlight': 'пишет качественно.',
    'leaderboard.subtitle': 'Отслеживайте производительность вашей инженерной команды. Оценки качества, объём PR и индекс, который учитывает скорость и мастерство.',
    'leaderboard.chart_title': 'Квадрант производительности',
    'leaderboard.legend.high_both': 'Высокое качество + объём',
    'leaderboard.legend.high_quality': 'Высокое качество',
    'leaderboard.col.rank': 'Место',
    'leaderboard.col.developer': 'Разработчик',
    'leaderboard.col.prs': 'PR',
    'leaderboard.col.quality': 'Ср. качество',
    'leaderboard.col.index': 'Индекс',
    'leaderboard.axis.volume': 'Объём PR →',
    'leaderboard.axis.quality': 'Ср. качество →',

    // Scroll reveal
    'scroll.text': 'Мы создали Sentra, потому что код, сгенерированный ИИ, всё ещё нуждается в интеллектуальном ревью. Не просто линтинг — настоящее понимание архитектуры, анализ безопасности и контекстные предложения, которые помогают вашей команде работать быстрее и безопаснее.',

    // How it works
    'how.badge': 'Как это работает',
    'how.title.line1': 'Три шага.',
    'how.title.line2': 'Без лишних действий.',

    // How it works steps
    'how.step1.title': 'Откройте Pull Request',
    'how.step1.desc': 'Пушьте код как обычно. Sentra мгновенно обнаруживает новые PR через вебхуки GitHub.',
    'how.step2.title': 'ИИ анализирует диф',
    'how.step2.desc': 'Контекстный анализ: уязвимости безопасности, архитектурные проблемы, вопросы производительности и качество кода.',
    'how.step3.title': 'Проверьте и деплойте',
    'how.step3.desc': 'Комментарии появляются прямо в GitHub. Исправления в один клик. Мержьте с уверенностью.',

    // Stats
    'stats.title': 'Доверие в масштабе.',
    'stats.review_time': 'Среднее время ревью',
    'stats.accuracy': 'Точность',
    'stats.fewer_incidents': 'Меньше инцидентов',
    'stats.faster_shipping': 'Быстрее деплой',

    // CTA
    'cta.title.line1': 'Перестаньте деплоить баги.',
    'cta.title.line2': 'Начните деплоить уверенность.',
    'cta.subtitle': 'Присоединяйтесь к инженерным командам стартапов и корпораций, которые доверяют Sentra защиту своей кодовой базы.',
    'cta.button': 'Начать бесплатно',
    'cta.note': 'Карта не требуется',

    // Footer
    'footer.product': 'Продукт',
    'footer.company': 'Компания',
    'footer.legal': 'Правовая информация',
    'footer.copyright': '© 2025 Sentra AI. Все права защищены.',
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('sentra_lang') || 'en';
  });

  const switchLang = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('sentra_lang', newLang);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
