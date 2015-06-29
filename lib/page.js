exports.getPageParam=function(req){
	var start,limit=25;
	if(req.query){
		start=req.query.start;
		limit=req.query.limit;
	}else{
		start=req.body.start;
		limit=req.body.limit;
	}
	var page1={start:start,limit:limit};
	return page1;
};

exports.getDatePage=function(start,limit,totalCount,result){
	var dataResult={start:start,limit:limit,totalCount:totalCount,result:result};
	return dataResult;
};