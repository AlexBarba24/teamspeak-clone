#pragma once
#include "portaudio.h"
#include <arpa/inet.h>
#include <cstdint>
#include <ostream>
#include <sstream>
#include <string>
#include <thread>
#include <unistd.h>
#include <vector>

class Voip {
private:
  static Voip *voip;
  std::thread *callThread = nullptr;
  bool killThread = false;
  void processData();
  void terminateThread();
  void spawnThread();
  std::vector<std::string> connections;
  int createSocket(int port);
  void closeSocket();
  int sock;
  float *transmissionBuffer;
  float *receptionBuffer;
  int bufferLen;
  bool sockOpen = false;
  sockaddr_in server{};
  void udpSend(int port);
  void udpRecieve(int port);
  static int micCallback(const void *inputBuffer, void *outputBuffer,
                         unsigned long frameCount,
                         const PaStreamCallbackTimeInfo *timeInfo,
                         PaStreamCallbackFlags statusFlags, void *userData);

public:
  Voip();
  void join(std::string ip);
  void leave();
  std::thread *getThread();
  static Voip *getVoip() { return voip; };
  const std::vector<std::string> &getConnections() { return connections; };
};