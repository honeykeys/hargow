/**
 * Demo Lecture: Understanding Perplexity AI
 * Duration: ~45 minutes
 *
 * This file contains a pre-made lecture script and extracted main points
 * for demo purposes. Main points are timed to appear naturally throughout
 * the lecture at realistic intervals.
 */

export interface DemoMainPoint {
  text: string;
  /** Delay in seconds from the start of the lecture */
  delaySeconds: number;
  /** Optional enriched content for this point */
  enrichedText?: string;
  citations?: string[];
}

/**
 * Main points extracted from the lecture
 * Timed to appear every 2-3 minutes throughout a 45-minute lecture
 */
export const DEMO_MAIN_POINTS: DemoMainPoint[] = [
  // Introduction (0-5 minutes)
  {
    text: "Perplexity AI is a conversational search engine that combines traditional search with large language models to provide direct answers with cited sources",
    delaySeconds: 120, // 2 minutes
  },
  {
    text: "Unlike traditional search engines that return links, Perplexity synthesizes information from multiple sources and presents a coherent answer with inline citations",
    delaySeconds: 240, // 4 minutes
  },

  // Architecture & Technology (5-12 minutes)
  {
    text: "Perplexity uses a multi-model approach, leveraging GPT-4, Claude, and their own fine-tuned models depending on the query type and user preferences",
    delaySeconds: 360, // 6 minutes
  },
  {
    text: "The system employs a retrieval-augmented generation (RAG) architecture: first retrieving relevant sources, then synthesizing answers based on that context",
    delaySeconds: 480, // 8 minutes
  },
  {
    text: "Real-time web search is integrated directly into the generation process, allowing Perplexity to access current information beyond the model's training cutoff",
    delaySeconds: 600, // 10 minutes
  },

  // Search Quality & Sources (12-20 minutes)
  {
    text: "Perplexity indexes and searches across academic papers, news articles, websites, and structured databases to provide comprehensive answers",
    delaySeconds: 720, // 12 minutes
  },
  {
    text: "Every claim in a Perplexity response includes numbered citations that link directly to the source material, enabling verification and deeper exploration",
    delaySeconds: 840, // 14 minutes
  },
  {
    text: "The platform uses semantic search rather than keyword matching, understanding the intent and context behind queries for more relevant results",
    delaySeconds: 960, // 16 minutes
  },
  {
    text: "Source quality is evaluated using multiple signals including domain authority, recency, citation count, and relevance to the query",
    delaySeconds: 1080, // 18 minutes
  },

  // User Experience & Features (20-28 minutes)
  {
    text: "Perplexity's thread-based interface allows follow-up questions that maintain context, enabling natural conversation and progressive refinement",
    delaySeconds: 1200, // 20 minutes
  },
  {
    text: "The 'Focus' feature lets users narrow searches to specific domains like academic papers, YouTube videos, Reddit discussions, or technical documentation",
    delaySeconds: 1320, // 22 minutes
  },
  {
    text: "Pro users gain access to unlimited GPT-4 queries, image analysis, file uploads, and API access for integration with other tools",
    delaySeconds: 1440, // 24 minutes
  },
  {
    text: "Collections allow users to organize research threads, share them with teams, and build knowledge bases around specific topics or projects",
    delaySeconds: 1560, // 26 minutes
  },

  // Comparison with Other Tools (28-35 minutes)
  {
    text: "Compared to ChatGPT, Perplexity's key advantage is real-time web access and citation of current sources rather than relying solely on training data",
    delaySeconds: 1680, // 28 minutes
  },
  {
    text: "Unlike Google Search, Perplexity directly answers questions rather than providing a list of links, saving time and synthesizing information",
    delaySeconds: 1800, // 30 minutes
  },
  {
    text: "Perplexity competes with Microsoft Copilot and Google Bard, but differentiates through superior citation quality and academic research capabilities",
    delaySeconds: 1920, // 32 minutes
  },

  // Use Cases & Applications (35-42 minutes)
  {
    text: "Researchers use Perplexity to quickly survey literature, find recent papers, and track citations across academic domains",
    delaySeconds: 2040, // 34 minutes
  },
  {
    text: "Developers leverage Perplexity for technical documentation search, debugging assistance, and staying current with framework updates",
    delaySeconds: 2160, // 36 minutes
  },
  {
    text: "Business analysts use Collections to compile market research, competitor analysis, and industry trends with automatic source tracking",
    delaySeconds: 2280, // 38 minutes
  },
  {
    text: "Students benefit from Perplexity's ability to explain complex topics with cited sources, making it valuable for research papers and studying",
    delaySeconds: 2400, // 40 minutes
  },

  // Future & Conclusion (42-45 minutes)
  {
    text: "Perplexity is expanding into multimodal search with image understanding, video analysis, and voice interactions for more natural queries",
    delaySeconds: 2520, // 42 minutes
  },
  {
    text: "The future of search involves conversational AI that understands context, provides verifiable answers, and adapts to individual user needs and expertise levels",
    delaySeconds: 2640, // 44 minutes
  },
];

/**
 * Full lecture transcript (for reference and potential future use)
 * This is what a teacher would actually say during the lecture
 */
export const DEMO_LECTURE_TRANSCRIPT = `
Welcome everyone. Today we're going to explore Perplexity AI, which represents a fascinating evolution in how we search for and discover information online. Over the next 45 minutes, I'll walk you through what makes Perplexity unique, how it works under the hood, and why it matters in the broader landscape of AI-powered tools.

Let me start with a simple question: What is Perplexity AI? At its core, Perplexity is a conversational search engine that combines traditional web search with large language models to provide direct answers with cited sources. Instead of giving you ten blue links like Google, Perplexity reads through those sources and synthesizes a coherent answer, complete with inline citations so you can verify the information.

This is a fundamentally different approach to information retrieval. Unlike traditional search engines that return links for you to click through and read yourself, Perplexity synthesizes information from multiple sources and presents a coherent answer with inline citations. It's doing the reading and synthesis work for you, but crucially, it's showing its work through those citations.

Now let's talk about the technology that powers this. Perplexity uses a multi-model approach, leveraging GPT-4, Claude, and their own fine-tuned models depending on the query type and user preferences. This is actually quite clever - they're not locked into a single model provider, which gives them flexibility and allows them to optimize for different use cases.

The architecture itself is based on what's called retrieval-augmented generation, or RAG. The system employs a retrieval-augmented generation architecture: first retrieving relevant sources, then synthesizing answers based on that context. This is crucial because it means the model isn't just making things up from its training data - it's grounding its responses in actual, current web content.

And speaking of current content, one of Perplexity's key innovations is that real-time web search is integrated directly into the generation process, allowing Perplexity to access current information beyond the model's training cutoff. This addresses one of the biggest limitations of standalone language models like ChatGPT, which have a knowledge cutoff date and can't tell you about recent events or new information.

Let's dive deeper into how Perplexity handles sources and search quality. Perplexity indexes and searches across academic papers, news articles, websites, and structured databases to provide comprehensive answers. It's not just searching Google - they have their own indexing infrastructure and relationships with academic databases, news providers, and other specialized sources.

Here's something really important about trust and verification: every claim in a Perplexity response includes numbered citations that link directly to the source material, enabling verification and deeper exploration. You can click on any citation number and jump straight to the source. This is crucial for academic work, fact-checking, and building trust in AI-generated content.

The search technology itself is quite sophisticated. The platform uses semantic search rather than keyword matching, understanding the intent and context behind queries for more relevant results. So if you ask "Why is the sky blue?" it understands you want an explanation of light scattering, not just web pages that contain those exact words.

How does Perplexity decide which sources to trust? Source quality is evaluated using multiple signals including domain authority, recency, citation count, and relevance to the query. They have algorithms that weight academic journals more heavily for scientific questions, prioritize recent sources for current events, and consider how often a source is cited by other reputable sources.

Now let's talk about the user experience and features that make Perplexity powerful. Perplexity's thread-based interface allows follow-up questions that maintain context, enabling natural conversation and progressive refinement. You can ask a question, get an answer, then say "tell me more about that second point" and it knows what you're referring to. This conversational flow is much more natural than starting fresh searches every time.

There's also a feature called Focus that's incredibly useful. The Focus feature lets users narrow searches to specific domains like academic papers, YouTube videos, Reddit discussions, or technical documentation. So if you're researching a scientific topic, you can focus on academic papers. If you want user experiences with a product, focus on Reddit. This dramatically improves the relevance of results.

For power users, there's Perplexity Pro. Pro users gain access to unlimited GPT-4 queries, image analysis, file uploads, and API access for integration with other tools. The free tier is quite generous, but Pro removes limits and unlocks more advanced features like analyzing charts, PDFs, and images.

One feature I'm particularly excited about is Collections. Collections allow users to organize research threads, share them with teams, and build knowledge bases around specific topics or projects. Imagine you're doing market research on electric vehicles - you can create a Collection that gathers all your searches, answers, and sources in one place, then share it with your team. It becomes a living research document.

Let me now compare Perplexity with other tools you might be familiar with. Compared to ChatGPT, Perplexity's key advantage is real-time web access and citation of current sources rather than relying solely on training data. ChatGPT is incredible for reasoning, coding, and creative tasks, but if you ask it about something that happened last week, it won't know. Perplexity will.

Unlike Google Search, Perplexity directly answers questions rather than providing a list of links, saving time and synthesizing information. Google is unmatched for finding specific websites or shopping, but if you want an answer to a complex question, reading through ten different articles and synthesizing them yourself takes time. Perplexity does that synthesis for you.

Perplexity competes with Microsoft Copilot and Google Bard, but differentiates through superior citation quality and academic research capabilities. Both Copilot and Bard have web search, but in my experience, Perplexity's citations are more granular and reliable, and it handles academic queries particularly well.

So who actually uses Perplexity, and for what? Let's look at some real-world use cases. Researchers use Perplexity to quickly survey literature, find recent papers, and track citations across academic domains. Instead of spending hours on Google Scholar, they can ask Perplexity for a summary of recent research on a topic, then dive into the cited papers that look most relevant.

Developers leverage Perplexity for technical documentation search, debugging assistance, and staying current with framework updates. Ask it "how do I implement authentication in Next.js 14" and you'll get a current answer with code examples and links to official docs. It's particularly good at synthesizing information from documentation, Stack Overflow, and GitHub issues.

Business analysts use Collections to compile market research, competitor analysis, and industry trends with automatic source tracking. You can build an entire competitive analysis report by asking questions, saving them to a Collection, and having all the sources automatically tracked and citable.

Students benefit from Perplexity's ability to explain complex topics with cited sources, making it valuable for research papers and studying. The citations are crucial here - you can't just submit AI-generated text as your own work, but you can use Perplexity to understand a topic, then read the cited sources and write your own analysis.

Looking toward the future, Perplexity is expanding into multimodal search with image understanding, video analysis, and voice interactions for more natural queries. Imagine taking a photo of a plant and asking "what is this and how do I care for it?" or uploading a chart and asking "explain this trend." These capabilities are already starting to appear in Pro.

More broadly, I believe the future of search involves conversational AI that understands context, provides verifiable answers, and adapts to individual user needs and expertise levels. Perplexity is at the forefront of this transformation. We're moving from the era of "here are ten links" to "here's the answer, and here's how I know."

This shift has profound implications. It changes how we do research, how we learn, how we make decisions based on information. It also raises important questions about trust, verification, and the role of AI in mediating our access to knowledge. That's why features like citations are so crucial - they keep humans in the loop, able to verify and dig deeper.

Thank you all for your attention today. I hope this gives you a solid foundation for understanding Perplexity AI and how it fits into the evolving landscape of search and information discovery. Are there any questions?
`;

/**
 * Calculate total lecture duration based on the last main point
 */
export const DEMO_LECTURE_DURATION_SECONDS = Math.max(
  ...DEMO_MAIN_POINTS.map(p => p.delaySeconds)
) + 60; // Add 1 minute buffer

/**
 * Get main points that should be shown at the current elapsed time
 */
export function getMainPointsForTime(elapsedSeconds: number): DemoMainPoint[] {
  return DEMO_MAIN_POINTS.filter(point => point.delaySeconds <= elapsedSeconds);
}

/**
 * Get the next main point that should appear
 */
export function getNextMainPoint(elapsedSeconds: number): DemoMainPoint | null {
  const upcomingPoints = DEMO_MAIN_POINTS.filter(
    point => point.delaySeconds > elapsedSeconds
  );

  if (upcomingPoints.length === 0) return null;

  // Return the point with the smallest delay that's still in the future
  return upcomingPoints.reduce((closest, point) =>
    point.delaySeconds < closest.delaySeconds ? point : closest
  );
}
