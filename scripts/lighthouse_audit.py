import subprocess
import json
import sys
import os

def run_lighthouse(url):
    print(f"Running Lighthouse audit on {url}...")
    
    # Run lighthouse via npx
    report_path = "lighthouse-report.json"
    command = [
        "npx", "--yes", "lighthouse", url,
        "--output=json",
        f"--output-path={report_path}",
        '--chrome-flags="--headless"',
        "--only-categories=performance" # Focus on performance for now
    ]
    
    try:
        # Run command, capture output but don't fail immediately on non-zero exit code
        process = subprocess.run(
            " ".join(command),
            shell=True,
            capture_output=True,
            text=True
        )
        
        if not os.path.exists(report_path):
            print("Error: Lighthouse failed to generate a report.")
            print(f"Stderr: {process.stderr}")
            if process.stdout:
                print(f"Stdout: {process.stdout}")
            return
            
        with open(report_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        categories = data.get('categories', {})
        perf_score = categories.get('performance', {}).get('score', 0) * 100
        
        print(f"\n===== Performance Score: {perf_score:.0f}/100 =====")
        
        audits = data.get('audits', {})
        
        print("\n--- Core Web Vitals (Metrics) ---")
        metrics = [
            'first-contentful-paint',
            'largest-contentful-paint',
            'total-blocking-time',
            'cumulative-layout-shift',
            'speed-index'
        ]
        
        for m in metrics:
            if m in audits:
                print(f"{audits[m].get('title')}: {audits[m].get('displayValue')}")
                
        print("\n--- Opportunities (Quick Wins) ---")
        for audit_id, audit in audits.items():
            if audit.get('details', {}).get('type') == 'opportunity' and audit.get('score', 1) < 1:
                savings = audit.get('details', {}).get('overallSavingsMs', 0)
                if savings > 0:
                     print(f"- {audit.get('title')}: Save {savings}ms")
                     
        print("\n--- Diagnostics (Potential Bottlenecks) ---")
        diagnostics = [
            'mainthread-work-breakdown',
            'bootup-time',
            'dom-size',
            'server-response-time',
            'render-blocking-resources'
        ]
        for d in diagnostics:
             if d in audits and audits[d].get('score', 1) < 1:
                 print(f"- {audits[d].get('title')}")
                 if audits[d].get('displayValue'):
                      print(f"  {audits[d].get('displayValue')}")
                 
        # Cleanup
        os.remove(report_path)
                      
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python lighthouse_audit.py <url>")
        sys.exit(1)
    run_lighthouse(sys.argv[1])
