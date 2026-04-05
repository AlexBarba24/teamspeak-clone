#include "voip.h"
#include <iostream>

int main() {
  std::cout << "Hello World" << std::endl;
  Voip voip;
  char c;
  while (std::cin >> c) {
    switch (c) {
    case 'c': {
      std::string ipString;
      std::cin >> ipString;
      voip.join(ipString);
      break;
    }
    case 'd': {
      voip.leave();
      std::cout << "Exited Successfully" << std::endl;
      break;
    }
    default:
      break;
    }
  }
}
