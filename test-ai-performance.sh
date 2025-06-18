#!/bin/bash

# Test configuration
TEST_QUERY="What is the capital of France?"
API_URL="http://localhost:3001/api/chat"
CONVERSATION_ID="test-performance-$(date +%s)"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AI Provider Performance Test${NC}"
echo "================================"
echo "Test Query: \"$TEST_QUERY\""
echo "API Endpoint: $API_URL"
echo "Timestamp: $(date)"

# Check if server is running
echo -e "\n${YELLOW}🔍 Checking server status...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001" | grep -q "404\|200"; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running on port 3001!${NC}"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

# Function to test a provider
test_provider() {
    local name=$1
    local provider=$2
    local model=$3
    local description=$4
    
    echo -e "\n${BLUE}🧪 Testing $name...${NC}"
    echo "   Model: $model"
    echo "   Provider: $provider"
    echo "   $description"
    
    # Create request payload
    local payload=$(cat <<EOF
{
  "messages": [
    {
      "role": "user",
      "content": "$TEST_QUERY"
    }
  ],
  "conversationId": "$CONVERSATION_ID",
  "model": "$model",
  "provider": "$provider",
  "useOpenRouter": false
}
EOF
)
    
    # Measure performance
    local start_time=$(date +%s.%N)
    
    # Make the request and capture response
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        --max-time 30)
    
    local end_time=$(date +%s.%N)
    local total_time=$(echo "$end_time - $start_time" | bc)
    
    # Extract HTTP status code and curl time
    local http_code=$(echo "$response" | tail -2 | head -1)
    local curl_time=$(echo "$response" | tail -1)
    
    # Remove status code and time from response
    local response_body=$(echo "$response" | head -n -2)
    
    # Check if successful
    if [[ "$http_code" == "200" ]]; then
        echo -e "${GREEN}✅ Success${NC}"
        echo "   Total time: ${total_time}s"
        echo "   CURL time: ${curl_time}s"
        
        # Try to extract some text from the streaming response
        local text_preview=$(echo "$response_body" | grep '^0:' | head -1 | cut -d':' -f2- | sed 's/^"//' | sed 's/"$//' | head -c 100)
        if [[ -n "$text_preview" ]]; then
            echo "   Response preview: $text_preview..."
        fi
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "   Total time: ${total_time}s"
        
        # Try to extract error message
        local error_msg=$(echo "$response_body" | jq -r '.error' 2>/dev/null || echo "$response_body" | head -c 100)
        echo "   Error: $error_msg"
    fi
    
    # Save result
    echo "$name|$provider|$model|$http_code|$total_time|$curl_time" >> test_results.tmp
    
    # Brief pause between tests
    sleep 1
}

# Create temporary results file
rm -f test_results.tmp

# Run tests
test_provider "Google (Paid API)" "google" "gemini-2.5-flash-preview-05-20" "Google Gemini 2.5 Flash with paid API"
test_provider "OpenAI Direct" "openai" "gpt-4o-mini-azure" "OpenAI GPT-4o Mini (via Azure if configured)"
test_provider "Anthropic Direct" "anthropic" "claude-3-haiku-20240307" "Anthropic Claude 3 Haiku (BYOK)"
test_provider "Azure OpenAI" "azure" "gpt-4o-mini-azure" "Azure OpenAI deployment"

# Display summary
echo -e "\n${BLUE}📊 Performance Summary${NC}"
echo "======================"
echo "Provider           | Status | Total Time | CURL Time"
echo "-------------------|--------|------------|----------"

while IFS='|' read -r name provider model http_code total_time curl_time; do
    status="❌"
    if [[ "$http_code" == "200" ]]; then
        status="✅"
    fi
    
    printf "%-18s | %s    | %10.3fs | %9.3fs\n" "$name" "$status" "$total_time" "$curl_time"
done < test_results.tmp

# Find fastest successful provider
echo -e "\n${BLUE}🏆 Results:${NC}"
fastest=$(grep "|200|" test_results.tmp | sort -t'|' -k5 -n | head -1)
if [[ -n "$fastest" ]]; then
    fastest_name=$(echo "$fastest" | cut -d'|' -f1)
    fastest_time=$(echo "$fastest" | cut -d'|' -f5)
    echo "   Fastest Provider: $fastest_name (${fastest_time}s)"
fi

# Save detailed results
results_file="ai-performance-results-$(date +%s).json"
echo "{" > "$results_file"
echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$results_file"
echo "  \"query\": \"$TEST_QUERY\"," >> "$results_file"
echo "  \"results\": [" >> "$results_file"

first=true
while IFS='|' read -r name provider model http_code total_time curl_time; do
    if [[ "$first" != "true" ]]; then
        echo "," >> "$results_file"
    fi
    first=false
    
    cat >> "$results_file" <<EOF
    {
      "name": "$name",
      "provider": "$provider",
      "model": "$model",
      "httpCode": $http_code,
      "totalTime": $total_time,
      "curlTime": $curl_time,
      "success": $([ "$http_code" == "200" ] && echo "true" || echo "false")
    }
EOF
done < test_results.tmp

echo "" >> "$results_file"
echo "  ]" >> "$results_file"
echo "}" >> "$results_file"

echo -e "\n💾 Detailed results saved to: $results_file"

# Cleanup
rm -f test_results.tmp