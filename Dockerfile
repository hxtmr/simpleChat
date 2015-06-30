FROM ubuntu
MAINTAINER Ma Xianbin (624826172@qq.com)

RUN apt-get update

#install sshd
RUN apt-get install -y openssh-server
RUN mkdir -p /var/run/sshd
RUN mkdir -p /root/.ssh

#add root's password
RUN echo "root:111111"|chpasswd
RUN sed -i 's/without-password/yes/' /etc/ssh/sshd_config

#add scripts
ADD run.sh /run.sh
RUN chmod 755 /run.sh

EXPOSE 22

CMD ["/run.sh"]
