import { AppService } from './app.service';

import { Controller, Get, Post, Req, Res } from '@nestjs/common';

import { Configuration, OpenAIApi } from 'openai';
import { Response } from 'express';
import { createReadStream } from 'fs';

import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
console.log('process.env.NEST_OPENAI_API_KEY', process.env);

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('/chat-question')
  async getChatAnswer(
    @Res() res: Response,
    @Req()
    { body }: { body: any },
  ) {
    try {
      const configuration = new Configuration({
        apiKey: this.configService.get('NEST_OPENAI_API_KEY'),
      });
      const openai = new OpenAIApi(configuration);
      const completion = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: body?.question ?? '',
        temperature: 0.6,
        max_tokens: 4000,
      });
      console.log('response', completion.data);
      res.status(200).json({ result: completion.data?.choices?.[0]?.text });
    } catch (error) {
      // Consider adjusting the error handling logic for your use case
      if (error.response) {
        console.error(error.response.status, error.response.data);
        res.status(error.response.status).json(error.response.data);
      } else {
        console.error(`Error with OpenAI API request: ${error.message}`);
        res.status(500).json({
          error: {
            message: 'An error occurred during your request.',
          },
        });
      }
    }
  }

  // @Sse("/chat-bot")
  // async getChatBot(
  //   @Res() res: Response,
  //   @Req()
  //   { body }: { body: any },
  // ): Promise<any> {
  //   try {
  //     const completion = await openai.createChatCompletion(
  //       {
  //         model: "gpt-3.5-turbo",
  //         messages: [{ role: "user", content: "berikan cerpen 100 kata" }],
  //         stream: true,
  //         max_tokens: 700,
  //       },
  //       {
  //         responseType: "stream",
  //       },
  //     );
  //     (completion.data as any).on("data", (data: any) => {
  //       console.log("data", data);
  //     });

  //     // console.log("response dimar:", completion.data);
  //     // return completion;
  //     // const stream = completion;

  //     // res.pipe(completion.request);
  //     // return stream;
  //     // return new Response(completion.request, {
  //     //   headers: {
  //     //     "Content-Type": "text/event-stream",
  //     //   },
  //     // });
  //   } catch (error) {
  //     console.log("error", error);
  //     // Consider adjusting the error handling logic for your use case
  //     if (error.response) {
  //       console.error(error.response.status, error.response.data);
  //       res.status(error.response.status).json(error.response.data);
  //     } else {
  //       console.error(`Error with OpenAI API request: ${error.message}`);
  //       res.status(500).json({
  //         error: {
  //           message: "An error occurred during your request.",
  //         },
  //       });
  //     }
  //   }
  // }

  @Get('/chat-bot2')
  async getChatBot2(@Res() res: Response) {
    const configuration = new Configuration({
      apiKey: this.configService.get('NEST_OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);
    const prompt = "Sample prompt. What's 2+2?";
    const https = await import('node:https');
    const req = https.request(
      {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + configuration.apiKey,
        },
      },
      function (res) {
        res.on('data', (chunk) => {
          console.log('BODY: ' + chunk);
        });

        res.on('end', () => {
          console.log('No more data in response.');
        });
      },
    );

    const body = JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      temperature: 0.6,
      max_tokens: 512,
      top_p: 1.0,
      frequency_penalty: 0.5,
      presence_penalty: 0.7,
      stream: true,
    });

    req.on('error', (e) => {
      console.error('problem with request:' + e.message);
    });

    req.write(body);

    req.end();

    // res.pipe(req);
  }

  @Post('/chat-bot3')
  async getChatBot3(@Res() res: any, @Req() { body }: { body: any }) {
    try {
      const configuration = new Configuration({
        apiKey: this.configService.get('NEST_OPENAI_API_KEY'),
      });
      const openai = new OpenAIApi(configuration);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Transfer-Encoding', 'chunked');

      const response = await openai
        .createCompletion(
          {
            prompt: `
            pertanyaan: 
            ${body?.pertanyaan ?? ''}
    
            jawaban benar: 
            ${body?.jawabanBenar ?? ''}

            jawaban mahasiswa: 
            ${body?.jawabanMahasiswa ?? ''}
    
            instruksi: 
            1. Berdasar jawaban benar dan jawaban mahasiswa, berikan penilaian dengan skala 1-10, dimana 1 adalah sangat tidak sesuai dan 10 adalah sangat sesuai. kalimat yang terbolak balik tidak masuk dalam penilaian.
            2. Berikan penjelasan mengapa jawaban mahasiswa tidak sesuai dengan jawaban benar.
            3. Berikan saran jika jawaban salah. beri tahu letak salah nya.
            
          `,
            stream: true,
            max_tokens: 2048,
            temperature: 0.4,
            model: 'text-davinci-003',
          },
          { responseType: 'stream' },
        )
        .catch((error) => {
          console.log('error', error);

          throw error;
        });

      const stream = response.data as any as Readable;

      stream
        .on('data', (chunk) => {
          try {
            const data =
              JSON.parse(chunk?.toString()?.trim()?.replace('data: ', '')) ??
              {};
            res.write(
              `data: ` +
                JSON.stringify({
                  text:
                    data?.choices?.[0]?.text?.trim() == ''
                      ? `\n`
                      : data?.choices?.[0]?.text,
                }) +
                '\n',
            );
            res.flush();
          } catch (error) {
            console.log('Skipable error');
          }
        })
        .pipe(res);

      stream.on('end', () => {
        res.end();
      });

      stream.on('error', (error) => {
        console.error(error);
        res.end(
          JSON.stringify({
            error: true,
            message: 'Error generating response.',
          }),
        );
      });
    } catch (error) {
      console.log(error);
    }
  }
}
