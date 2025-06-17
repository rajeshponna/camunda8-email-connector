import { InferenceClient } from "@huggingface/inference";
import { Camunda8 } from "@camunda8/sdk";
import 'dotenv/config';

const camunda = new Camunda8({
  ZEEBE_ADDRESS: process.env.ZEEBE_ADDRESS!,
  ZEEBE_CLIENT_ID: process.env.ZEEBE_CLIENT_ID!,
  ZEEBE_CLIENT_SECRET: process.env.ZEEBE_CLIENT_SECRET!,
  CAMUNDA_OAUTH_URL: process.env.CAMUNDA_OAUTH_URL!,
  CAMUNDA_TASKLIST_BASE_URL: process.env.CAMUNDA_TASKLIST_BASE_URL!,
  CAMUNDA_OPERATE_BASE_URL: process.env.CAMUNDA_OPERATE_BASE_URL!,
  CAMUNDA_OPTIMIZE_BASE_URL: process.env.CAMUNDA_OPTIMIZE_BASE_URL!,
  CAMUNDA_SECURE_CONNECTION: true
});

const zeebeClient = camunda.getZeebeGrpcApiClient();
const hfClient = new InferenceClient(process.env.HF_TOKEN!);

export async function askHuggingFace(prompt: string) {
  const response = await hfClient.chatCompletion({
    provider: "nebius",
    model: "mistralai/Mistral-Nemo-Instruct-2407",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  return response.choices[0].message.content;
}

zeebeClient.createWorker({
  taskType: "process-email",
  taskHandler: async (job) => {
    const { senderName, fromAddress, subject, plainTextBody } = job.variables;
    const processInstanceKey = job.processInstanceKey;

    console.log("Process Instance Key:", processInstanceKey);
    console.log({ senderName, fromAddress, subject, plainTextBody });

    const prompt = `You received the following email from ${fromAddress} with the subject "${subject}":${plainTextBody}Generate a polite and professional email reply to the sender.
The reply should be context-aware and relevant to the received message.
End the reply with "Best regards, Rajesh. This kind of response not need for me i Subject: Re: Holiday trip\n\nHi Rajesh,\n\n and which will help me make a decision more promptly? i just need matter so i can use has variable".
`;

    const reply = await askHuggingFace(prompt) || "Unable to generate a reply at the moment.";

    return job.complete({reply: reply }); 
  },
});


