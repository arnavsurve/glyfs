import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Network nodes and connections
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      pulsePhase: number;
      type: "hub" | "node" | "data";
    }> = [];

    // Data streams
    const streams: Array<{
      path: Array<{ x: number; y: number }>;
      progress: number;
      speed: number;
      opacity: number;
      char: string;
    }> = [];

    // Initialize nodes
    for (let i = 0; i < 12; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 2,
        opacity: Math.random() * 0.5 + 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        type: i < 3 ? "hub" : i < 8 ? "node" : "data",
      });
    }

    // Data characters for streams
    const dataChars = [
      "█",
      "▓",
      "▒",
      "░",
      "●",
      "◯",
      "▪",
      "▫",
      "∶",
      "∷",
      "⟨",
      "⟩",
    ];

    // Create data streams
    const createStream = () => {
      const startNode = nodes[Math.floor(Math.random() * nodes.length)];
      const endNode = nodes[Math.floor(Math.random() * nodes.length)];

      if (startNode === endNode) return;

      // Create smooth bezier curve path
      const controlX1 = startNode.x + (Math.random() - 0.5) * 200;
      const controlY1 = startNode.y + (Math.random() - 0.5) * 200;
      const controlX2 = endNode.x + (Math.random() - 0.5) * 200;
      const controlY2 = endNode.y + (Math.random() - 0.5) * 200;

      const path: Array<{ x: number; y: number }> = [];
      for (let t = 0; t <= 1; t += 0.02) {
        const x =
          Math.pow(1 - t, 3) * startNode.x +
          3 * Math.pow(1 - t, 2) * t * controlX1 +
          3 * (1 - t) * Math.pow(t, 2) * controlX2 +
          Math.pow(t, 3) * endNode.x;
        const y =
          Math.pow(1 - t, 3) * startNode.y +
          3 * Math.pow(1 - t, 2) * t * controlY1 +
          3 * (1 - t) * Math.pow(t, 2) * controlY2 +
          Math.pow(t, 3) * endNode.y;
        path.push({ x, y });
      }

      streams.push({
        path,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        opacity: 0.6 + Math.random() * 0.4,
        char: dataChars[Math.floor(Math.random() * dataChars.length)],
      });
    };

    // Initialize some streams
    for (let i = 0; i < 8; i++) {
      createStream();
    }

    let animationFrame: number;
    const animate = () => {
      // Clear with subtle trail effect
      ctx.fillStyle = "rgba(20, 20, 23, 0.03)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isDark = document.documentElement.classList.contains("dark");
      const baseColor = isDark ? "rgba(255, 255, 255, " : "rgba(0, 0, 0, ";

      // Update and draw nodes
      nodes.forEach((node, index) => {
        // Gentle movement
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Keep nodes in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Pulse effect
        node.pulsePhase += 0.02;
        const pulse = Math.sin(node.pulsePhase) * 0.2 + 0.8;

        // Draw connections to nearby nodes
        nodes.forEach((other, otherIndex) => {
          if (index >= otherIndex) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity =
              (1 - distance / 150) * 0.1 * node.opacity * other.opacity;
            ctx.strokeStyle = baseColor + opacity + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });

        // Draw node
        const nodeOpacity = node.opacity * pulse * 0.4;
        if (node.type === "hub") {
          // Hub nodes are larger and more prominent
          ctx.fillStyle = baseColor + nodeOpacity + ")";
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Inner glow
          ctx.fillStyle = baseColor + nodeOpacity * 0.3 + ")";
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = baseColor + nodeOpacity + ")";
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Update and draw data streams
      streams.forEach((stream, index) => {
        stream.progress += stream.speed;

        if (stream.progress >= 1) {
          streams.splice(index, 1);
          return;
        }

        // Draw flowing data
        const currentIndex = Math.floor(stream.progress * stream.path.length);
        const trailLength = 8;

        for (let i = 0; i < trailLength; i++) {
          const trailIndex = currentIndex - i;
          if (trailIndex < 0) continue;

          const point = stream.path[trailIndex];
          const trailOpacity = stream.opacity * (1 - i / trailLength) * 0.6;

          ctx.fillStyle = baseColor + trailOpacity + ")";
          ctx.font = `${12 - i}px Geist Mono`;
          ctx.textAlign = "center";
          ctx.fillText(stream.char, point.x, point.y);
        }
      });

      // Occasionally create new streams
      if (Math.random() < 0.01 && streams.length < 15) {
        createStream();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateSize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none opacity-45 dark:opacity-30"
        style={{ zIndex: 0 }}
      />

      {/* Content overlay */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-border/40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-center py-8">
              <h1 className="text-2xl font-medium">Glyfs</h1>
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-medium mb-8 tracking-tight leading-tight">
              Plug and play infrastructure for your AI agents.
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              The easiest way to deploy production-ready MCP agents.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="h-12 px-8 text-base"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Simple feature list */}
        <section className="py-24 px-6 border-t border-border/40">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-lg font-medium mb-3">MCP Integration</h3>
                <p className="text-muted-foreground">
                  Connect any MCP server without writing protocol code
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">All Providers</h3>
                <p className="text-muted-foreground">
                  One API for Anthropic, OpenAI, Google, and more
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Built-in Testing</h3>
                <p className="text-muted-foreground">
                  Chat with your agents and test tool calls directly in the
                  platform
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Simple CTA */}
        <section className="py-24 px-6 border-t border-border/40">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-medium mb-6">Ready to build?</h2>
            <p className="text-muted-foreground mb-8">
              Start with our free tier. No credit card required.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="h-12 px-8"
            >
              Start building
            </Button>
          </div>
        </section>

        {/* Minimal footer */}
        <footer className="border-t border-border/40 py-12 px-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="text-muted-foreground">
              © 2025 Grace Infrastructure
            </span>
            <div className="flex gap-8">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Docs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Support
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
