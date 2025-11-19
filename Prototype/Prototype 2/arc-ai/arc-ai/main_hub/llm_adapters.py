"""
LLM Adapters - Ollama and other LLM integrations
"""
import logging
import time
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class OllamaAdapter:
    """
    Adapter for Ollama LLM API
    Connects to http://localhost:11434/api/generate
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "mistral:7b",
        timeout: int = 300,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize Ollama adapter
        
        Args:
            base_url: Base URL of Ollama service (default: http://localhost:11434)
            model: Model name (default: mistral:7b)
            timeout: Request timeout in seconds (default: 300)
            max_retries: Maximum number of retry attempts (default: 3)
            retry_delay: Delay between retries in seconds (default: 1.0)
        """
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.api_url = f"{self.base_url}/api/generate"
        
        # Verify Ollama is accessible
        self._verify_ollama()
    
    def _verify_ollama(self):
        """Verify Ollama service is accessible"""
        try:
            # Try to list models to verify connection
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            response.raise_for_status()
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            
            if self.model not in model_names:
                logger.warning(f"Model '{self.model}' not found in Ollama. Available models: {model_names}")
                logger.warning(f"Will attempt to use '{self.model}' anyway (Ollama may pull it if needed)")
            else:
                logger.info(f"Verified Ollama connection. Model '{self.model}' is available.")
                
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not verify Ollama connection: {e}")
            logger.warning("Will attempt to connect when first request is made.")
    
    def call_local_ollama(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Call local Ollama API to generate text
        
        Args:
            prompt: The prompt text to send to Ollama
            max_tokens: Maximum tokens to generate (Ollama uses 'num_predict')
            timeout: Override default timeout for this request
        
        Returns:
            dict with 'text' and 'tokens' keys on success
            dict with 'error' key on failure
        """
        start_time = time.time()
        prompt_length = len(prompt)
        timeout = timeout or self.timeout
        
        logger.info(f"Calling Ollama API - Model: {self.model}, Prompt length: {prompt_length} chars")
        logger.debug(f"API URL: {self.api_url}, Timeout: {timeout}s")
        
        # Build request payload with optimized settings
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False  # Non-streaming for simplicity
        }
        
        # Optimize Ollama settings for faster responses
        options = {
            "temperature": 0.7,
            "num_predict": max_tokens or 512,  # Limit tokens for faster response
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.1
        }
        
        if max_tokens:
            options["num_predict"] = max_tokens
        
        payload["options"] = options
        
        # Retry logic
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.post(
                    self.api_url,
                    json=payload,
                    timeout=timeout,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract response text
                generated_text = data.get("response", "").strip()
                
                # Extract token counts
                eval_count = data.get("eval_count", 0)  # Tokens generated
                prompt_eval_count = data.get("prompt_eval_count", 0)  # Tokens in prompt
                total_tokens = eval_count + prompt_eval_count
                
                elapsed = time.time() - start_time
                logger.info(
                    f"Ollama generated {len(generated_text)} chars "
                    f"(~{eval_count} tokens generated, {total_tokens} total) "
                    f"in {elapsed:.2f}s"
                )
                
                return {
                    "text": generated_text,
                    "tokens": eval_count  # Return generated tokens
                }
                
            except requests.exceptions.Timeout:
                last_error = f"Request timed out after {timeout}s"
                logger.warning(f"Attempt {attempt}/{self.max_retries} failed: {last_error}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * attempt)  # Exponential backoff
                    continue
                else:
                    return {"error": last_error}
                    
            except requests.exceptions.HTTPError as e:
                last_error = f"HTTP error: {e.response.status_code} - {e.response.text[:200]}"
                logger.warning(f"Attempt {attempt}/{self.max_retries} failed: {last_error}")
                if attempt < self.max_retries and e.response.status_code >= 500:
                    # Retry on server errors
                    time.sleep(self.retry_delay * attempt)
                    continue
                else:
                    return {"error": last_error}
                    
            except requests.exceptions.RequestException as e:
                last_error = f"Request error: {str(e)}"
                logger.warning(f"Attempt {attempt}/{self.max_retries} failed: {last_error}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * attempt)
                    continue
                else:
                    return {"error": last_error}
                    
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                logger.error(f"Unexpected error in Ollama adapter: {e}")
                return {"error": last_error}
        
        # All retries failed
        return {"error": f"All {self.max_retries} attempts failed. Last error: {last_error}"}
    
    def generate(self, prompt: str) -> Dict[str, Any]:
        """
        Generate text using Ollama (wrapper for call_local_ollama)
        
        Args:
            prompt: The prompt text
        
        Returns:
            dict with 'text' and 'tokens' keys
        
        Raises:
            TimeoutError: If request times out
            RuntimeError: If request fails after retries
        """
        result = self.call_local_ollama(prompt, timeout=self.timeout)
        
        if "error" in result:
            error_msg = result["error"]
            if "timeout" in error_msg.lower():
                raise TimeoutError(error_msg)
            else:
                raise RuntimeError(error_msg)
        
        return result

