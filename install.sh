VERSION="2.0"
TIMESTAMP=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Clear screen and show banner
clear

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  ${MAGENTA}████████╗██████╗ ${CYAN}██╗   ██╗██╗    ██╗███╗   ██╗███████╗${CYAN}    ║"
echo "║  ${MAGENTA}╚══██╔══╝██╔══██╗${CYAN}██║   ██║██║    ██║████╗  ██║██╔════╝${CYAN}    ║"
echo "║     ${MAGENTA}██║   ███████║${CYAN}██║   ██║██║ █╗ ██║██╔██╗ ██║█████╗  ${CYAN}    ║"
echo "║     ${MAGENTA}██║   ██╔══██║${CYAN}██║   ██║██║███╗██║██║╚██╗██║██╔══╝  ${CYAN}    ║"
echo "║     ${MAGENTA}██║   ██║  ██║${CYAN}╚██████╔╝╚███╔███╔╝██║ ╚████║███████╗${CYAN}    ║"
echo "║     ${MAGENTA}╚═╝   ╚═╝  ╚═╝${CYAN} ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝${CYAN}    ║"
echo "║                                                              ║"
echo "║  ${GREEN}██╗   ██╗██╗    ██╗███╗   ██╗███████╗    ${YELLOW}██╗   ██╗██╗ ██████╗████████╗${CYAN} ║"
echo "║  ${GREEN}██║   ██║██║    ██║████╗  ██║██╔════╝    ${YELLOW}██║   ██║██║██╔════╝╚══██╔══╝${CYAN} ║"
echo "║  ${GREEN}██║   ██║██║ █╗ ██║██╔██╗ ██║█████╗      ${YELLOW}██║   ██║██║██║        ██║   ${CYAN}   ║"
echo "║  ${GREEN}██║   ██║██║███╗██║██║╚██╗██║██╔══╝      ${YELLOW}╚██╗ ██╔╝██║██║        ██║   ${CYAN}   ║"
echo "║  ${GREEN}╚██████╔╝╚███╔███╔╝██║ ╚████║███████╗     ${YELLOW}╚████╔╝ ██║╚██████╗   ██║   ${CYAN}   ║"
echo "║  ${GREEN} ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝      ${YELLOW}╚═══╝  ╚═╝ ╚═════╝   ╚═╝   ${CYAN}   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}${CYAN}         Premium Subscription Dashboard Theme v${VERSION}${NC}"
echo -e "${YELLOW}         ─────────────────────────────────────────${NC}"
echo ""
echo -e "${BLUE}  [✓] Modern UI Design      [✓] Real-time Stats Monitor${NC}"
echo -e "${BLUE}  [✓] Mobile Optimized      [✓] Smart Insights${NC}"
echo -e "${BLUE}  [✓] Countdown Timer       [✓] Offline Mode Support${NC}"
echo ""
echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${RED}  ⚠️  NOTICE: This project is for EDUCATIONAL PURPOSES ONLY.${NC}"
echo -e "${RED}  ⚠️  The user is solely responsible for any consequences.${NC}"
echo -e "${RED}  ⚠️  USE AT YOUR OWN RISK.${NC}"
echo ""
echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
sleep 2

# Progress animation
show_progress() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local msg="$2"
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        for i in $(seq 0 9); do
            echo -ne "\r${CYAN}[${spinstr:$i:1}] ${msg}...${NC}"
            sleep $delay
        done
    done
    echo -ne "\r${GREEN}[✓] ${msg}... Done!${NC}\n"
}

# Step indicator
STEP=1
step() {
    echo -e "\n${BOLD}${CYAN}[Step ${STEP}]${NC} ${YELLOW}$1${NC}"
    echo -e "${CYAN}────────────────────────────────────${NC}"
    ((STEP++))
}

if [ "$EUID" -ne 0 ]; then
  echo -e "\n${RED}[✗] Error: Please run as root (sudo bash install.sh)${NC}"
  exit 1
fi

XUI_ROOT="/usr/local/x-ui"
BASE_PATH="$XUI_ROOT/web"
ASSETS_PATH="$BASE_PATH/assets"
HTML_PATH="$BASE_PATH/html"

step "Detecting Environment & Branch"

if [ -z "$BRANCH" ]; then
    BRANCH="main"
    if curl -s --head "https://raw.githubusercontent.com/ThilinaM99/3xui-Usage_Checker/development/install.sh" | grep -q "200 OK"; then
        if [ -f "/tmp/xui_installer_dev" ]; then
            BRANCH="development"
        fi
    fi
fi

echo -e "  ${GREEN}→${NC} Branch: ${GREEN}${BRANCH}${NC}"
REPO_URL="https://raw.githubusercontent.com/ThilinaM99/3xui-Usage_Checker/${BRANCH}"

step "Creating Directory Structure"
mkdir -p "$ASSETS_PATH/js"
mkdir -p "$ASSETS_PATH/css"
mkdir -p "$HTML_PATH"
echo -e "  ${GREEN}→${NC} Directories created: ${CYAN}$BASE_PATH${NC}"

step "Backing Up Existing Files"
[[ -f "$ASSETS_PATH/js/subscription.js" ]] && cp "$ASSETS_PATH/js/subscription.js" "$ASSETS_PATH/js/subscription.js.bak" 2>/dev/null && echo -e "  ${GREEN}→${NC} Backed up: subscription.js"
[[ -f "$ASSETS_PATH/css/premium.css" ]] && cp "$ASSETS_PATH/css/premium.css" "$ASSETS_PATH/css/premium.css.bak" 2>/dev/null && echo -e "  ${GREEN}→${NC} Backed up: premium.css"

step "Syncing Official Web Assets"

if ! command -v unzip &> /dev/null; then
    echo -e "  ${CYAN}→${NC} Installing unzip..."
    apt-get install unzip -y >/dev/null 2>&1 || yum install unzip -y >/dev/null 2>&1
fi

# Detect x-ui version
RAW_VER=$( (/usr/local/x-ui/x-ui -v 2>&1 || /usr/local/x-ui/x-ui --version 2>&1 || /usr/local/x-ui/x-ui version 2>&1) | grep -iEo '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)

LOCAL_VER=""
if [[ -n "$RAW_VER" ]]; then
    LOCAL_VER="v${RAW_VER}"
fi

ARCHIVE_URL="https://github.com/MHSanaei/3x-ui/archive/refs/heads/main.zip"
EXTRACT_FOLDER="3x-ui-main"

if [[ -n "$LOCAL_VER" ]]; then
    echo -e "  ${GREEN}→${NC} Detected 3x-ui version: ${GREEN}${LOCAL_VER}${NC}"
    TAG_URL="https://github.com/MHSanaei/3x-ui/archive/refs/tags/${LOCAL_VER}.zip"
    if curl -s --head "$TAG_URL" | head -n 1 | grep -E "200|301|302" >/dev/null; then
        ARCHIVE_URL="$TAG_URL"
        RAW_VER="${LOCAL_VER#v}"
        EXTRACT_FOLDER="3x-ui-${RAW_VER}"
        echo -e "  ${GREEN}→${NC} Using version-matched assets"
    else
        echo -e "  ${YELLOW}→${NC} Version tag not found, using latest main"
    fi
else
    echo -e "  ${YELLOW}→${NC} Could not detect version, using latest main"
fi

TEMP_ZIP="/tmp/3x-ui-assets.zip"
echo -e "  ${CYAN}→${NC} Downloading assets..."
curl -Ls "$ARCHIVE_URL" -o "$TEMP_ZIP"
mkdir -p "/tmp/3x-ui-extract"
unzip -qo "$TEMP_ZIP" -d "/tmp/3x-ui-extract"

cp -rf "/tmp/3x-ui-extract/${EXTRACT_FOLDER}/web/"* "$BASE_PATH/"
rm -rf "$TEMP_ZIP" "/tmp/3x-ui-extract"
echo -e "  ${GREEN}→${NC} Assets synced successfully"

step "Downloading TMS-VPN Theme Files"

echo -e "  ${CYAN}→${NC} Fetching subscription.js..."
curl -Ls "$REPO_URL/web/assets/js/subscription.js?v=$TIMESTAMP" -o "$ASSETS_PATH/js/subscription.js"
echo -e "  ${CYAN}→${NC} Fetching premium.css..."
curl -Ls "$REPO_URL/web/assets/css/premium.css?v=$TIMESTAMP" -o "$ASSETS_PATH/css/premium.css"

SUBPAGE_PATH="$HTML_PATH/settings/panel/subscription/subpage.html"
mkdir -p $(dirname "$SUBPAGE_PATH")
echo -e "  ${CYAN}→${NC} Fetching subpage template..."
curl -Ls "$REPO_URL/web/html/settings/panel/subscription/subpage.html?v=$VERSION" -o "$SUBPAGE_PATH"

step "Applying Cache Busting"

sed -i "s|assets/css/premium.css?{{ .cur_ver }}|assets/css/premium.css?v=$TIMESTAMP|g" "$SUBPAGE_PATH"
sed -i "s|assets/js/subscription.js?{{ .cur_ver }}|assets/js/subscription.js?v=$TIMESTAMP|g" "$SUBPAGE_PATH"
sed -i "s|__VERSION__|$TIMESTAMP|g" "$ASSETS_PATH/js/subscription.js"
[[ -f "/usr/local/x-ui/isp_info.json" ]] && rm -f "/usr/local/x-ui/isp_info.json"
echo -e "  ${GREEN}→${NC} Cache busting applied"

chmod -R 755 "$BASE_PATH"

step "Injecting Update Persistence"

SERVICE_FILE="/etc/systemd/system/x-ui.service"
if [[ -f "$SERVICE_FILE" ]]; then
    if ! grep -q "XUI_DEBUG=true" "$SERVICE_FILE"; then
        sed -i '/\[Service\]/a Environment="XUI_DEBUG=true"' "$SERVICE_FILE"
        echo -e "  ${GREEN}→${NC} Persistence injected successfully"
    else
        echo -e "  ${CYAN}→${NC} Persistence already enabled"
    fi
fi

step "Deploying System Stats Monitor"

STATS_SCRIPT="$XUI_ROOT/server_stats.sh"
STATS_SERVICE="/etc/systemd/system/x-ui-stats.service"
STATS_FILE="$XUI_ROOT/web/assets/css/status.json"

# Create stats collector script
cat <<"EOF" > "$STATS_SCRIPT"
#!/bin/bash
# System Stats Collector for 3x-ui Premium Theme (Enhanced)
JSON_FILE="__STATS_FILE__"
ISP_CACHE="/usr/local/x-ui/isp_info.json"
INTERVAL=2

INTERFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}')
[[ -z "$INTERFACE" ]] && INTERFACE=$(ip -o -4 route show to default | awk '{print $5; exit}')

prev_total=0
prev_idle=0
prev_rx=0
prev_tx=0

detect_infrastructure() {
    if [ ! -s "$ISP_CACHE" ]; then
        IP_DATA=$(curl -s --max-time 10 http://ip-api.com/json/)
        
 
        if [[ -z "$IP_DATA" || "$IP_DATA" == *"fail"* ]]; then
            IP_DATA=$(curl -s --max-time 10 https://ipinfo.io/json)
            ISP=$(echo "$IP_DATA" | grep -oE "\"org\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"org\"\s*:\s*\"//g" | sed 's/"$//g' | sed 's/^AS[0-9]* //')
            REGION=$(echo "$IP_DATA" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        else
            ISP=$(echo "$IP_DATA" | grep -oE "\"isp\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"isp\"\s*:\s*\"//g" | sed 's/"$//g')
            REGION=$(echo "$IP_DATA" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        fi
        
 
        [[ -z "$ISP" ]] && ISP="Unknown Provider"
        [[ -z "$REGION" ]] && REGION="Unknown Region"
        
        echo "{\"isp\":\"$ISP\",\"region\":\"$REGION\"}" > "$ISP_CACHE"
    fi
}

detect_infrastructure

while true; do
    if [ -f "$ISP_CACHE" ]; then
        ISP_DATA=$(cat "$ISP_CACHE")
        ISP=$(echo "$ISP_DATA" | grep -oE "\"isp\":\"[^\"]*\"" | cut -d'"' -f4)
        REGION=$(echo "$ISP_DATA" | grep -oE "\"region\":\"[^\"]*\"" | cut -d'"' -f4)
    else
        ISP="Detecting..."
        REGION="..."
    fi

    read cpu a b c idle rest < /proc/stat
    total=$((a+b+c+idle))
    
    if [ "$prev_total" -gt 0 ]; then
        diff_total=$((total-prev_total))
        diff_idle=$((idle-prev_idle))
        if [ "$diff_total" -gt 0 ]; then
            cpu_usage=$((100*(diff_total-diff_idle)/diff_total))
        else
            cpu_usage=0
        fi
    else
        cpu_usage=0
    fi
    
    prev_total=$total
    prev_idle=$idle
    
    mem_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    ram_usage=${mem_info%.*}

    if [ -n "$INTERFACE" ]; then
        read rx tx < <(grep "$INTERFACE" /proc/net/dev | awk '{print $2, $10}')
        if [ "$prev_rx" -gt 0 ]; then
            net_in=$(( (rx - prev_rx) / 1024 / INTERVAL ))
            net_out=$(( (tx - prev_tx) / 1024 / INTERVAL ))
        else
            net_in=0
            net_out=0
        fi
        prev_rx=$rx
        prev_tx=$tx
    else
        net_in=0
        net_out=0
    fi
    
    echo "{\"cpu\":$cpu_usage,\"ram\":$ram_usage,\"net_in\":$net_in,\"net_out\":$net_out,\"isp\":\"$ISP\",\"region\":\"$REGION\"}" > "$JSON_FILE.tmp"
    mv "$JSON_FILE.tmp" "$JSON_FILE"
    chmod 644 "$JSON_FILE"
    
    sleep $INTERVAL
done
EOF

# Replace placeholder with actual path
sed -i "s|__STATS_FILE__|$STATS_FILE|g" "$STATS_SCRIPT"
chmod +x "$STATS_SCRIPT"

# Create systemd service
cat <<"EOF" > "$STATS_SERVICE"
[Unit]
Description=3x-ui System Stats Monitor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/bin/bash __STATS_SCRIPT__
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sed -i "s|__STATS_SCRIPT__|$STATS_SCRIPT|g" "$STATS_SERVICE"

step "Finalizing Installation"

systemctl daemon-reload
systemctl enable x-ui-stats.service >/dev/null 2>&1
systemctl restart x-ui-stats.service

if systemctl is-active --quiet x-ui-stats.service; then
    echo -e "  ${GREEN}→${NC} Stats monitor running"
else
    echo -e "  ${YELLOW}→${NC} Stats service deployed (may need manual start)"
fi

echo -e "  ${CYAN}→${NC} Restarting x-ui service..."
systemctl daemon-reload
if command -v x-ui &> /dev/null; then
    x-ui restart
else
    systemctl restart x-ui
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║   ${BOLD}✅ TMS-VPN INSTALLED SUCCESSFULLY!${NC}${GREEN}                        ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}  ${BOLD}Next Steps:${NC}"
echo -e "  ${YELLOW}1.${NC} Open your 3x-ui panel in browser"
echo -e "  ${YELLOW}2.${NC} Go to ${CYAN}Settings → Panel Settings → Subscription${NC}"
echo -e "  ${YELLOW}3.${NC} Enable subscription and configure your settings"
echo -e "  ${YELLOW}4.${NC} Access your dashboard at: ${GREEN}http://your-server:port/sub/${NC}"
echo ""
echo -e "${MAGENTA}  ${BOLD}Support:${NC} ${CYAN}https://github.com/ThilinaM99/3xui-Usage_Checker${NC}"
echo -e "${YELLOW}  ──────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}🔧 Turn on the Inbuilt Subscription System (If not enabled)${NC}"

