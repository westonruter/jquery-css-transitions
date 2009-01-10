#!/usr/bin/perl -w
use strict;

open IN,   "jquery.css-transitions.js";
open OUT, ">jquery.css-transitions.min.js";
while(<IN>){
	if(/^\s*\*\s*$/){
		print OUT " */\n";
		last;
	}
	print OUT;
}


system("java -jar yuicompressor.jar jquery.css-transitions.js -o ~temp.js");
open IN, "~temp.js";
while(<IN>){
	print OUT;
}
close IN;
unlink('~temp.js');

close OUT;