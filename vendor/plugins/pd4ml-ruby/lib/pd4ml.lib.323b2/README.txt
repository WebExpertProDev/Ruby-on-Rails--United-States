Third-party libraries.
----------------------

Current version of PD4ML uses an open source library for CSS parsing (ss_css2.jar; licensed 
under LGPL). The library can be obtained from the original site:
http://sourceforge.net/projects/cssparser/
or from our download area:
http://pd4ml.zefer.org/cgi-bin/eng.cgi/download.htm?ch=2

Please download the library and place ss_css2.jar to the same location where pd4ml(_demo).jar is.

Web deployment.
---------------

In order to deploy PD4ML-enabled web application make sure that pd4ml(_demo).jar and 
ss_css2.jar are located in a place where your application server or servlet engine can 
find it -- in WEB-INF/lib would be a good place.  Make sure there isn't an incompatible 
version of the lib anywhere, including in the appserver-wide shared library 
directory (the name varies).

Deployment to UNIX-derived OS (Linux, Solaris etc)
----------------------------------------------------

Many server systems have no X server installed and associated with the servlet engine 
process. The X server is required by any Java component that needs special GUI resources 
like font metrics info or image processing. 

Some hints on how to solve that problem: 

1. The recommended solution is to run your application or servlet engine with 
-Djava.awt.headless=true given as parameter to the virtual machine. It is works only with 
JDK1.4 and above. Java 1.4 includes a new image I/O API that reportedly does not require 
an X server. 

2. Install xvfb. "It provides an X server that can run on machines with no display hardware 
and no physical input devices. It emulates a dumb framebuffer using virtual memory." 

National scripts and TTF fonts.
------------------------------

By default PD4ML supports only Latin-1 character set and the standard fonts of PDF viewer
applications. PD4ML Pro provides "TTF embedding" feature, which allows to embed to the resulting
PDFs TTF fonts of your choice (but they should be UNICODE) and to output texts, which include 
non-latin characters (like CJK or Cyrillic). See the reference manual in order to know how 
to configure and use the "TTF embedding".

Image and CSS links.
--------------------

Make sure, that all image or CSS URLs of source HTML document are either relative 
(<img src="images/logo.gif">) or fully specified (<img src="http://myserver/webapp/images/logo.gif">). 
PD4ML has no access to the servlet context of your web applications, so, for instance, it can not 
resolve web application name "/webapp" of <img src="/webapp/images/logo.gif"> to a physical path. 
PD4ML tries to read /webapp/images/logo.gif from root directory, which is wrong in the most of cases.

Switching of PD4ML debug mode on usually helps to determine "missing image" problem reason.
pd4ml.enableDebugInfo() API call or debug="true" attribute of <pd4ml:transform> tag force PD4ML
to dump image request absolute paths to STDOUT or to application server's log.

All CSS references should be located in <head> section of your HTML.





