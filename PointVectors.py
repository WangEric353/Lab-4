import numpy as np
import pandas as pd
import os
from sklearn.manifold import MDS 
import functools
from sklearn.cluster import KMeans
import math

#Data is gotten from the JS covariance calculations since it was easier to compute there
#Columns from left to right:  "First Cost", "Landed Cost", "Hanger", "Packaging & Label", "Trim", "Wash","Yarn Cost", "Tertiary Cost"
# covarianceMatrix = [[3.596648862592321,4.632475419202987,0.04953656894732569,0.008928924275626976,0.1347392346400454,0.42352376333090014,2.651122242692961,3.581801807645482],[4.632475419202987,6.1155565635906415,0.06367978248518791,0.008756717798879965,0.17505233666098508,0.5298268809349886,3.5174388120282467,4.629651701972243],[0.04953656894732569,0.06367978248518791,0.002838527798068313,0.0006682753834915994,0.000633936368801233,0.0042060934989043165,0.045472971022644235,0.05184670172875576],[0.008928924275626976,0.008756717798879965,0.0006682753834915994,0.016452775018261537,0.003482865838811784,-0.001994240077915739,-0.014463374095446815,0.014193682493304136],[0.1347392346400454,0.17505233666098508,0.000633936368801233,0.003482865838811784,0.07218485674863986,-0.0020096810323837555,0.07112066505965411,0.13749663988312624],[0.42352376333090014,0.5298268809349886,0.0042060934989043165,-0.001994240077915739,-0.0020096810323837555,0.24784568979790889,0.21679704802045288,0.4192679625030434],[2.651122242692961,3.5174388120282467,0.045472971022644235,-0.014463374095446815,0.07112066505965411,0.21679704802045288,3.155817006747582,2.576782101723886],[3.581801807645482,4.629651701972243,0.05184670172875576,0.014193682493304136,0.13749663988312624,0.4192679625030434,2.576782101723886,3.6501300287314398]]

#JS Covariance Code:
#function calculateCovariance(property1,property2, averageProperty1, averageProperty2){
#    let property1Data = data.map((x)=>x[property1]);
#    let property2Data = data.map((x)=>x[property2]);
#    return property1Data.reduce((acc,x,i)=> acc + (x - averageProperty1)*(property2Data[i]-averageProperty2),0)/(property1Data.length);
#}

# numpyCovariance = np.array(covarianceMatrix)
# eigenValues, eigenvector = np.linalg.eig(numpyCovariance)
# print(eigenValues) #Output: [1.54141804e+01 1.04874479e+00 1.94132007e-01 1.90832737e-03 1.55372762e-02 3.31171839e-02 8.66155025e-02 6.32387984e-02] -> Select eigenvectors associated with first and second eigenvalues since highest

# print(eigenvector[0])   
# print(eigenvector[1])

dataframe = pd.read_csv(os.getcwd() + "\\CSE332 Dataset.csv")

dataframe['Yarn Cost'] = dataframe['YY'] * dataframe["Fabric (per yd/lb)"]

result = []
numIters = 7


for i in range(1,numIters + 1):
    result.append(KMeans(n_clusters = i).fit(dataframe[['First Cost', 'Landed Cost', 'Hanger', 'Packaging & Label', 'Trim', 'Wash', 'Yarn Cost', 'Tertiary Cost']]))

def euclidDistance(vector1, vector2):
    if(len(vector1) != len(vector2)):
        print("Vector lengths not equal: ", vector1, vector2, ". Will cut off extraneous numbers")
    return math.sqrt(functools.reduce(lambda acc,x: acc+x,map(lambda x: pow(x[0]-x[1],2),zip(vector1,vector2)),0))

dfArray = list(map(lambda kmeansObj: list(zip(list(dataframe[['First Cost', 'Landed Cost', 'Hanger', 'Packaging & Label', 'Trim', 'Wash', 'Yarn Cost', 'Tertiary Cost']].values),list(map(lambda clusterId: kmeansObj.cluster_centers_[clusterId],kmeansObj.labels_)))),result))

objectiveFunction = list(map(lambda numClusters: pow(functools.reduce(lambda acc,x: acc+euclidDistance(x[0],x[1]),numClusters,0),2),dfArray))

colorResult = list(map(lambda kmeansObj: list(zip(list(map(lambda x:list(x),dataframe[['Supplier Name','Item ID']].values)),kmeansObj.labels_)),result))

colorKMeans = list(map(lambda x:list(x),colorResult[2]))


f = open("objectiveValues.csv", "w")
f.write(str(objectiveFunction)[1:-1])
f.close()

f = open("kMeansGroup.csv", "w")
f.write("Supplier Name,Item ID, Group\n")
for entry in colorKMeans:
    f.write(entry[0][0] + "," + str(entry[0][1]) + "," + str(entry[1]) + "\n")
f.close()

