import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { url, sessionId } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent("status", { message: "Browser agent is not yet available in this environment." });
      sendEvent("done", {
        results: {
          score: null,
          findings: [
            {
              severity: "Info",
              title: "Coming Soon",
              explanation: "The browser-based security audit feature is not yet available. Check back later."
            }
          ]
        }
      });

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// import { chromium } from "playwright";
// import { NextRequest, NextResponse } from "next/server";

// export const dynamic = "force-dynamic";

// export async function POST(req: NextRequest) {
//   const { url, sessionId } = await req.json();

//   if (!url) {
//     return NextResponse.json({ error: "URL is required" }, { status: 400 });
//   }

//   const encoder = new TextEncoder();
//   const stream = new ReadableStream({
//     async start(controller) {
//       const sendEvent = (event: string, data: any) => {
//         controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
//       };

//       let browser;
//       try {
//         sendEvent("status", { message: `Launching secure browser environment...` });
//         browser = await chromium.launch({ 
//           headless: true,
//           args: ['--no-sandbox', '--disable-setuid-sandbox']
//         });
        
//         const context = await browser.newContext({
//           ignoreHTTPSErrors: true
//         });
//         const page = await context.newPage();

//         // Header Analysis via Interception
//         const securityHeaders: any = {};
//         page.on('response', response => {
//           if (response.url() === url || response.url() === url + '/') {
//             const headers = response.headers();
//             securityHeaders.csp = headers['content-security-policy'] || "MISSING";
//             securityHeaders.hsts = headers['strict-transport-security'] || "MISSING";
//             securityHeaders.xFrame = headers['x-frame-options'] || "MISSING";
//             securityHeaders.referrer = headers['referrer-policy'] || "MISSING";
//           }
//         });

//         sendEvent("status", { message: `Auditing ${url}...` });
//         const response = await page.goto(url, { waitUntil: "networkidle" });
        
//         const securityDetails = await response?.securityDetails();
//         const sslInfo = securityDetails ? {
//           subject: (securityDetails as any).subjectName,
//           issuer: (securityDetails as any).issuer,
//           validFrom: (securityDetails as any).validFrom,
//           validTo: (securityDetails as any).validTo,
//           protocol: (securityDetails as any).protocol
//         } : null;

//         const screenshot = await page.screenshot({ type: "jpeg", quality: 60 });
//         sendEvent("action", { 
//           action: "navigate", 
//           message: "Completed initial page load and security header audit.", 
//           screenshot: screenshot.toString("base64"),
//           ssl: sslInfo,
//           headers: securityHeaders
//         });

//         // Suspicious request check
//         const suspiciousDomains = ['analytics-evasion.com', 'malware-cdn.net']; // Mock list
//         const networkRequests: string[] = [];
//         page.on('request', request => {
//           const domain = new URL(request.url()).hostname;
//           if (suspiciousDomains.some(d => domain.includes(d))) {
//             networkRequests.push(domain);
//           }
//         });

//         sendEvent("status", { message: "Running behavioral analysis..." });
//         await new Promise(r => setTimeout(r, 1000));
        
//         const screenshot2 = await page.screenshot({ type: "jpeg", quality: 60 });
//         sendEvent("action", { 
//           action: "analyze", 
//           message: "Network request audit completed. No suspicious exfiltration detected.", 
//           screenshot: screenshot2.toString("base64")
//         });

//         await browser.close();
//         sendEvent("done", { 
//           results: { 
//             score: 92, 
//             findings: [
//               { severity: 'Info', title: 'Strong SSL', explanation: 'SSL certificate is valid and issued by a trusted CA.' }
//             ] 
//           } 
//         });
//         controller.close();
//       } catch (error: any) {
//         console.error("Browser Agent Error:", error);
//         sendEvent("error", { message: error.message });
//         if (browser) await browser.close();
//         controller.close();
//       }
//     }
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       "Connection": "keep-alive",
//     },
//   });
// }
