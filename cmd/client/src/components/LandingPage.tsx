import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Bot,
  Shield,
  ArrowRight,
  Github,
  Sparkles,
  ChevronRight,
  Terminal,
  Plug,
  Activity,
  Code2,
  CheckCircle,
  Server,
  MessageSquare,
  BarChart,
  Key,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODELS, PROVIDERS } from "../types/agent.types";
import Marquee from "react-fast-marquee";

// Provider Logo Components
const AnthropicLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <img
    src="https://cdn.brandfetch.io/idW5s392j1/w/338/h/338/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1738315794862"
    alt="Anthropic"
    className={className}
  />
);

const OpenAILogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

const GoogleLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Scrolling models component
const ScrollingModels = ({
  models,
  className = "",
}: {
  models: string[];
  className?: string;
}) => {
  return (
    <div className={`w-full max-w-full h-6 ${className}`}>
      <Marquee
        speed={60}
        gradient={true}
        gradientColor="hsl(var(--card))"
        gradientWidth={15}
        pauseOnHover={true}
      >
        {models.map((model, index) => (
          <span
            key={index}
            className="mx-3 text-sm text-muted-foreground opacity-70 whitespace-nowrap"
          >
            {model}
          </span>
        ))}
      </Marquee>
    </div>
  );
};

export function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeCodeTab, setActiveCodeTab] = useState("curl");

  const curlExample = `curl -X POST "https://glyfs.devapi/agents/your-agent-id/invoke" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "message": "Help customer #12345 with their recent order",
    "history": [
      {
        "role": "user",
        "content": "Previous conversation context"
      },
      {
        "role": "assistant",
        "content": "I understand. Let me help you with that."
      }
    ]
  }'`;

  const jsExample = `const response = await fetch("https://glyfs.devapi/agents/your-agent-id/invoke", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    message: "Help customer #12345 with their recent order",
    history: [
      { role: "user", content: "Previous conversation context" },
      { role: "assistant", content: "I understand. Let me help you with that." }
    ]
  })
});

const data = await response.json();
console.log(data.response);`;

  const pythonExample = `import requests

response = requests.post(
    "https://glyfs.devapi/agents/your-agent-id/invoke",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
    },
    json={
        "message": "Help customer #12345 with their recent order",
        "history": [
            {"role": "user", "content": "Previous conversation context"},
            {"role": "assistant", "content": "I understand. Let me help you with that."}
        ]
    }
)

data = response.json()
print(data["response"])`;

  const features = [
    {
      icon: Plug,
      title: "MCP Server Integration",
      description:
        "Connect your agents to any MCP server with a few clicks. No protocol implementation needed.",
      gradient:
        "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
    },
    {
      icon: Activity,
      title: "Full Observability",
      description:
        "Track every request, tool call, and response. Debug with confidence using comprehensive logs.",
      gradient:
        "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20",
    },
    {
      icon: Code2,
      title: "Unified API",
      description:
        "One consistent API across all providers. Switch models without changing your code.",
      gradient:
        "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
    },
    {
      icon: MessageSquare,
      title: "In-Platform Testing",
      description:
        "Chat with your agents instantly. Test tool calls and refine prompts in real-time.",
      gradient:
        "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20",
    },
  ];

  // Provider model lists
  const providerModels = {
    anthropic: MODELS[PROVIDERS.ANTHROPIC].map((model) => model.label),
    openai: MODELS[PROVIDERS.OPENAI].map((model) => model.label),
    google: ["Gemini Pro", "Gemini Flash", "Gemini Ultra", "Coming Soon..."],
  };

  const useCases = [
    {
      title: "Customer Support Automation",
      description:
        "Build agents that can access your help docs, CRM, and ticketing systems",
      icon: Bot,
      example: "Resolve tickets 10x faster with context-aware AI support",
    },
    {
      title: "Internal Tool Orchestration",
      description:
        "Let AI coordinate between your APIs, databases, and services",
      icon: Server,
      example: "Automate complex workflows that span multiple systems",
    },
    {
      title: "Development Assistants",
      description: "Create coding companions with access to your entire stack",
      icon: Code2,
      example: "AI that can read docs, write code, and run tests",
    },
  ];

  // ASCII art animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to cover viewport (fixed positioning)
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // ASCII characters for the animation
    const chars = [
      "0",
      "1",
      "⟨",
      "⟩",
      "{",
      "}",
      "/",
      "\\",
      "|",
      "-",
      "_",
      ".",
      "*",
      "&",
      "#",
      "@",
      "$",
      "%",
    ];
    const particles: Array<{
      x: number;
      y: number;
      char: string;
      speed: number;
      opacity: number;
      fadeSpeed: number;
      size: number;
    }> = [];

    // Create particles
    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        char: chars[Math.floor(Math.random() * chars.length)],
        speed: 0.2 + Math.random() * 0.5,
        opacity: 0,
        fadeSpeed: 0.008 + Math.random() * 0.015,
        size: 12 + Math.random() * 8,
      };
    };

    // Initialize more particles for full page coverage
    for (let i = 0; i < 120; i++) {
      particles.push(createParticle());
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        // Update position
        particle.y -= particle.speed;

        // Set font for each particle to enable size variation
        ctx.font = `${particle.size}px IBM Plex Mono`;

        // Fade in and out
        if (particle.opacity < 1 && particle.y > canvas.height * 0.1) {
          particle.opacity += particle.fadeSpeed * 2;
        } else {
          particle.opacity -= particle.fadeSpeed;
        }

        // Reset particle if it goes off screen or fades out
        if (particle.y < 0 || particle.opacity <= 0) {
          particles[index] = createParticle();
          particles[index].y = canvas.height;
        }

        // Draw particle with enhanced visibility
        const isDark = document.documentElement.classList.contains("dark");
        const baseColor = isDark ? 150 : 80;
        ctx.fillStyle = `rgba(${baseColor}, ${baseColor}, ${baseColor}, ${particle.opacity * 0.6})`;
        ctx.fillText(particle.char, particle.x, particle.y);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* ASCII Animation Background - Full Page */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full pointer-events-none opacity-60 dark:opacity-50 z-0"
        style={{
          mixBlendMode: "screen",
          height: "100vh",
        }}
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-background/50 to-transparent pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/20 backdrop-blur-md bg-gradient-to-b from-background/20 to-background/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Glyfs
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="hover:bg-primary/10 transition-all duration-300"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-4xl mx-auto text-center"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: "transform 0.3s ease-out",
          }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Deploy{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                production-ready
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 blur-2xl" />
            </span>
            <br />
            AI agents in minutes
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            The infrastructure platform that turns your prompts into secure,
            scalable API endpoints with MCP integration, observability, and
            instant testing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 px-8"
            >
              Start Building
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
            >
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* MCP Integration Hero Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-background/50 to-primary/5 backdrop-blur-sm imary/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Agents without tools are just{" "}
              <span className="text-muted-foreground line-through">
                expensive
              </span>{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                chatbots
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Integrating MCP-enabled agents in your application takes hundreds
              of lines of code. We make connecting them as easy as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Without MCP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Agents can only respond with text</p>
                <p>• No access to your systems or data</p>
                <p>• Complex custom integrations</p>
                <p>• Limited real-world usefulness</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Plug className="w-5 h-5" />
                  With MCP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Agents can read KB articles, query databases, call APIs</p>
                <p>• Access external resources and tools securely</p>
                <p>• One-click MCP server connections</p>
                <p>• Authentication and permissions handled</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="inline-block p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                <div className="font-semibold text-lg">
                  Zero Protocol Implementation
                </div>
              </div>
              <div className="text-muted-foreground">
                We handle MCP connections, auth, and security. You just plug and
                play.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-background/40 backdrop-blur-sm border-y border-border/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From idea to API in 3 steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No infrastructure setup. No complex deployments. Just results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Agent</h3>
              <p className="text-muted-foreground">
                Choose a model, write a system prompt, configure parameters.
                Your agent is ready in seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Capabilities</h3>
              <p className="text-muted-foreground">
                Connect MCP servers for tool access. Configure permissions. Test
                everything in our built-in chat.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Deploy & Scale</h3>
              <p className="text-muted-foreground">
                Get your API endpoint instantly. Monitor usage, track costs, and
                scale without limits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to ship{" "}
              <span className="italic">capable</span> AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We handle the infrastructure so you can focus on building amazing
              AI applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-gradient-to-br ${feature.gradient} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Benefits Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-background/40 backdrop-blur-sm border-y border-border/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why teams choose Glyfs
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">
                      Zero Infrastructure Overhead
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No servers to manage, no protocols to implement, no
                      scaling headaches.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">
                      Production-Ready from Day One
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Built-in auth, rate limiting, monitoring, and error
                      handling.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">
                      Tool Access Made Simple
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      MCP servers, APIs, and databases - connect anything with a
                      few clicks.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">
                      Complete Observability
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Track every request, debug tool calls, monitor costs - all
                      in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart className="w-5 h-5 text-primary" />
                  <CardTitle>Real-time Metrics</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Requests</span>
                    <span className="font-mono text-primary">2.4M</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-primary rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tool Calls</span>
                    <span className="font-mono text-primary">847K</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-primary rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Response Time</span>
                    <span className="font-mono text-primary">342ms</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/4 bg-primary rounded-full" />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Full analytics and logging for every agent
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Developer Experience Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, powerful API
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create agents in the dashboard, invoke them via API. Same
              interface for all providers.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Code2 className="w-6 h-6 text-primary" />
                  Agent Invocation API
                </CardTitle>
                <CardDescription>
                  Call your agents with a simple HTTP request. Works with any
                  model provider.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Language Tabs */}
                  <div className="flex border-b border-border">
                    <button
                      onClick={() => setActiveCodeTab("curl")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeCodeTab === "curl"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        cURL
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveCodeTab("javascript")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeCodeTab === "javascript"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        JavaScript
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveCodeTab("python")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeCodeTab === "python"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Python
                      </div>
                    </button>
                  </div>

                  {/* Code Content */}
                  <div className="min-h-[400px]">
                    {activeCodeTab === "curl" && (
                      <div className="rounded-lg overflow-hidden border bg-[#0d1117]">
                        <div className="p-6">
                          <pre className="text-sm text-[#e6edf3] overflow-x-auto">
                            <code className="language-bash">{curlExample}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {activeCodeTab === "javascript" && (
                      <div className="rounded-lg overflow-hidden border bg-[#0d1117]">
                        <div className="p-6">
                          <pre className="text-sm text-[#e6edf3] overflow-x-auto">
                            <code className="language-javascript">
                              {jsExample}
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {activeCodeTab === "python" && (
                      <div className="rounded-lg overflow-hidden border bg-[#0d1117]">
                        <div className="p-6">
                          <pre className="text-sm text-[#e6edf3] overflow-x-auto">
                            <code className="language-python">
                              {pythonExample}
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  >
                    View Full API Docs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-background/40 backdrop-blur-sm border-y border-border/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for real-world applications
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From internal tools to customer-facing products, Glyfs powers it
              all.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <useCase.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{useCase.title}</CardTitle>
                  <CardDescription>{useCase.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">
                    {useCase.example}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Every model. One API.
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Switch between providers instantly. Your code stays the same.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-600/20 blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div className="relative flex flex-col items-center p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-orange-500/30 transition-all duration-300 overflow-hidden">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <AnthropicLogo className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Anthropic</h3>
                <div className="w-full px-2">
                  <ScrollingModels models={providerModels.anthropic} />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-gray-100/20 blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div className="relative flex flex-col items-center p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-white/30 transition-all duration-300 overflow-hidden">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <OpenAILogo className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">OpenAI</h3>
                <div className="w-full px-2">
                  <ScrollingModels models={providerModels.openai} />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div className="relative flex flex-col items-center p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <GoogleLogo className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Google</h3>
                <div className="w-full px-2">
                  <ScrollingModels models={providerModels.google} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-background/40 backdrop-blur-sm border-y border-border/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your agents, your data, your control.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Isolated Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every agent runs in its own secure environment. Complete
                  isolation between agents and customers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <Key className="w-8 h-8 text-primary mb-2" />
                <CardTitle>API Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Secure API keys with granular permissions. Rate limiting and
                  usage controls built-in.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <Activity className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Full Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every request, tool call, and response logged. Complete
                  visibility for compliance and debugging.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 p-12 text-center backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to deploy your first agent?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join hundreds of developers building the future of AI-powered
                applications.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 px-8"
                >
                  Start Building
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-sm bg-background/80">
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Terminal className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Glyfs</h3>
              <span className="text-muted-foreground">© 2025</span>
            </div>
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-primary transition-colors"
              >
                API Docs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-primary transition-colors"
              >
                Pricing
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-primary transition-colors"
              >
                Support
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-primary transition-colors"
              >
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
