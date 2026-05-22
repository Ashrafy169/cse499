import os

from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = (
    "You are a helpful customer support assistant for AmberIT, a Bangladeshi ISP (Internet Service Provider). "
    "You help customers with billing questions, internet connection issues, plan information, and general support. "
    "Be friendly, concise, and helpful. Answer in the same language the customer uses. "
    "If the customer's account context is provided, use it to give personalized answers. "
    "For technical issues you cannot resolve, suggest the customer create a support ticket. "
    "Currency is Bangladeshi Taka (৳)."
)


def ask_groq(message: str, user_context: str = "") -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if user_context:
        messages.append({"role": "user", "content": f"[Customer Account Info]\n{user_context}"})
        messages.append({"role": "assistant", "content": "I have your account details. How can I help you today?"})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=messages,
        max_tokens=512,
    )
    return response.choices[0].message.content
